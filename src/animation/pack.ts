import { unzipSync } from 'fflate';
import type {
  AnimationClip,
  AnimationManifest,
  AnimationState,
  ParsedAnimationPack,
} from './types';
import { ANIMATION_STATES, isAnimationState } from './types';

export const MAX_PACK_BYTES = 5 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;

const DEFAULT_FPS: Record<AnimationState, number> = {
  idle: 8,
  feed: 12,
  play: 12,
  sleep: 4,
  wake: 10,
  walk: 10,
};

export class AnimationPackError extends Error {
  readonly issues: string[];

  constructor(issues: string[] | string) {
    const list = Array.isArray(issues) ? issues : [issues];
    super(list.join(' '));
    this.name = 'AnimationPackError';
    this.issues = list;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function parseManifest(bytes: Uint8Array): AnimationManifest {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AnimationPackError('manifest.json is not valid JSON.');
  }

  if (!isRecord(value)) {
    throw new AnimationPackError('manifest.json must contain a JSON object.');
  }

  const issues: string[] = [];
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const description = value.description;
  const frameWidth = value.frameWidth;
  const frameHeight = value.frameHeight;

  if (value.formatVersion !== 1) {
    issues.push('formatVersion must be 1.');
  }
  if (name.length < 1 || name.length > 32) {
    issues.push('name must be between 1 and 32 characters.');
  }
  if (
    description !== undefined &&
    (typeof description !== 'string' || description.length > 120)
  ) {
    issues.push('description must be at most 120 characters.');
  }
  if (!isIntegerInRange(frameWidth, 32, 512)) {
    issues.push('frameWidth must be an integer between 32 and 512.');
  }
  if (!isIntegerInRange(frameHeight, 32, 512)) {
    issues.push('frameHeight must be an integer between 32 and 512.');
  }

  const animations = {} as Record<AnimationState, AnimationClip>;
  const animationsValue = value.animations;

  if (!isRecord(animationsValue)) {
    issues.push('animations must be an object.');
  } else {
    for (const key of Object.keys(animationsValue)) {
      if (!isAnimationState(key)) {
        issues.push(`Unknown animation "${key}".`);
      }
    }

    for (const state of ANIMATION_STATES) {
      const clipValue = animationsValue[state];
      if (!isRecord(clipValue)) {
        issues.push(`animations.${state} is required.`);
        continue;
      }

      const frames = clipValue.frames;
      if (!isIntegerInRange(frames, 1, 24)) {
        issues.push(`animations.${state}.frames must be between 1 and 24.`);
      }

      let fps = DEFAULT_FPS[state];
      if (clipValue.fps !== undefined) {
        if (!isIntegerInRange(clipValue.fps, 4, 30)) {
          issues.push(`animations.${state}.fps must be between 4 and 30.`);
        } else {
          fps = clipValue.fps;
        }
      }

      if (isIntegerInRange(frames, 1, 24)) {
        animations[state] = { frames, fps };
      }
    }
  }

  if (issues.length > 0) {
    throw new AnimationPackError(issues);
  }

  return {
    formatVersion: 1,
    name,
    description: typeof description === 'string' ? description : undefined,
    frameWidth: frameWidth as number,
    frameHeight: frameHeight as number,
    animations,
  };
}

export function validateSvgFrame(
  svgText: string,
  manifest: Pick<AnimationManifest, 'frameWidth' | 'frameHeight'>,
  frameName = 'frame',
): string[] {
  const issues: string[] = [];
  const svgTag = /<svg\b[^>]*>/i.exec(svgText);
  if (!svgTag) {
    return [`${frameName}: missing a root <svg> element.`];
  }

  const viewBoxMatch = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svgTag[0]);
  if (!viewBoxMatch) {
    issues.push(`${frameName}: missing a viewBox attribute.`);
  } else {
    const viewBox = (viewBoxMatch[1] ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      viewBox.length !== 4 ||
      viewBox.some((part) => !Number.isFinite(part)) ||
      viewBox[0] !== 0 ||
      viewBox[1] !== 0 ||
      viewBox[2] !== manifest.frameWidth ||
      viewBox[3] !== manifest.frameHeight
    ) {
      issues.push(
        `${frameName}: viewBox must be "0 0 ${manifest.frameWidth} ${manifest.frameHeight}".`,
      );
    }
  }

  if (/<script\b/i.test(svgText)) {
    issues.push(`${frameName}: <script> elements are not allowed.`);
  }
  if (/\son[a-z]+\s*=/i.test(svgText)) {
    issues.push(`${frameName}: event-handler attributes are not allowed.`);
  }
  if (/<foreignObject\b/i.test(svgText)) {
    issues.push(`${frameName}: <foreignObject> is not allowed.`);
  }
  if (/<image\b/i.test(svgText)) {
    issues.push(`${frameName}: embedded <image> elements are not allowed.`);
  }
  if (/<(?:animate|animateTransform|set)\b/i.test(svgText)) {
    issues.push(`${frameName}: SVG animation elements are not allowed.`);
  }
  if (/@keyframes\b|animation\s*:/i.test(svgText)) {
    issues.push(`${frameName}: CSS animation is not allowed.`);
  }
  if (/@import\b/i.test(svgText)) {
    issues.push(`${frameName}: CSS imports are not allowed.`);
  }
  if (/javascript\s*:/i.test(svgText)) {
    issues.push(`${frameName}: javascript URLs are not allowed.`);
  }
  if (/\burl\(\s*['"]?\s*(?:https?:|\/\/|data:)/i.test(svgText)) {
    issues.push(`${frameName}: external CSS URLs are not allowed.`);
  }

  for (const match of svgText.matchAll(
    /\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi,
  )) {
    const href = (match[1] ?? '').trim();
    if (!href.startsWith('#')) {
      issues.push(`${frameName}: external href references are not allowed.`);
    }
  }

  return issues;
}

export function parsePetPackBytes(bytes: Uint8Array): ParsedAnimationPack {
  if (bytes.byteLength > MAX_PACK_BYTES) {
    throw new AnimationPackError(
      'The pack is larger than the 5 MB compressed limit.',
    );
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new AnimationPackError(
      'The file is not a readable .petpack ZIP archive.',
    );
  }

  const fileEntries = Object.keys(entries).filter((key) => !key.endsWith('/'));
  const fileSet = new Set(fileEntries);
  const uncompressedBytes = fileEntries.reduce(
    (total, key) => total + (entries[key]?.byteLength ?? 0),
    0,
  );
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    throw new AnimationPackError(
      'The pack is larger than the 20 MB uncompressed limit.',
    );
  }

  const manifestBytes = entries['manifest.json'];
  if (!manifestBytes) {
    throw new AnimationPackError('Missing manifest.json.');
  }

  const manifest = parseManifest(manifestBytes);
  const expected = new Set<string>(['manifest.json']);
  for (const state of ANIMATION_STATES) {
    for (let index = 0; index < manifest.animations[state].frames; index += 1) {
      expected.add(`frames/${state}/${index}.svg`);
    }
  }

  const issues: string[] = [];
  for (const key of fileEntries) {
    if (!expected.has(key)) {
      issues.push(`Unexpected file "${key}".`);
    }
  }
  for (const key of expected) {
    if (!fileSet.has(key)) {
      issues.push(`Missing file "${key}".`);
    }
  }
  if (issues.length > 0) {
    throw new AnimationPackError(issues);
  }

  const frames = {} as Record<AnimationState, Uint8Array[]>;
  const decoder = new TextDecoder();
  for (const state of ANIMATION_STATES) {
    const stateFrames: Uint8Array[] = [];
    for (let index = 0; index < manifest.animations[state].frames; index += 1) {
      const key = `frames/${state}/${index}.svg`;
      const bytesForFrame = entries[key];
      if (!bytesForFrame) {
        issues.push(`Missing file "${key}".`);
        continue;
      }

      const frameIssues = validateSvgFrame(
        decoder.decode(bytesForFrame),
        manifest,
        key,
      );
      issues.push(...frameIssues);
      stateFrames.push(bytesForFrame);
    }
    frames[state] = stateFrames;
  }

  if (issues.length > 0) {
    throw new AnimationPackError(issues);
  }

  return { manifest, frames };
}

export async function parsePetPackFile(file: File): Promise<ParsedAnimationPack> {
  if (!file.name.toLowerCase().endsWith('.petpack')) {
    throw new AnimationPackError('Choose a file with the .petpack extension.');
  }
  if (file.size > MAX_PACK_BYTES) {
    throw new AnimationPackError(
      'The pack is larger than the 5 MB compressed limit.',
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parsePetPackBytes(bytes);
}
