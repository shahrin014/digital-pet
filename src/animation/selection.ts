import { convertImageFileToSvg, FRAME_SIZE } from './convert';
import { AnimationPackError } from './errors';
import type {
  AnimationClip,
  AnimationManifest,
  AnimationState,
  ParsedAnimationPack,
} from './types';
import { ANIMATION_STATES } from './types';

export const MAX_CONVERTED_BYTES = 20 * 1024 * 1024;

export const DEFAULT_FPS: Record<AnimationState, number> = {
  idle: 8,
  feed: 12,
  play: 12,
  sleep: 4,
  wake: 10,
  walk: 10,
};

export type FrameConverter = (file: File) => Promise<Uint8Array>;

export interface AnimationSelection {
  name: string;
  frames: Record<AnimationState, File[]>;
  fps: Record<AnimationState, number>;
}

export function sortFrameFiles(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

export async function parseAnimationSelection(
  selection: AnimationSelection,
  convert: FrameConverter = convertImageFileToSvg,
): Promise<ParsedAnimationPack> {
  const issues: string[] = [];
  const name = selection.name.trim();

  if (name.length < 1 || name.length > 32) {
    issues.push('Animation name must be between 1 and 32 characters.');
  }

  const sortedFrames = {} as Record<AnimationState, File[]>;
  for (const state of ANIMATION_STATES) {
    const files = sortFrameFiles(selection.frames[state] ?? []);
    sortedFrames[state] = files;
    if (files.length < 1 || files.length > 24) {
      issues.push(`${state}: select between 1 and 24 frames.`);
    }

    const fps = selection.fps[state];
    if (
      typeof fps !== 'number' ||
      !Number.isInteger(fps) ||
      fps < 4 ||
      fps > 30
    ) {
      issues.push(`${state}: FPS must be an integer between 4 and 30.`);
    }
  }

  if (issues.length > 0) {
    throw new AnimationPackError(issues);
  }

  const converted = {} as Record<AnimationState, Uint8Array[]>;
  let totalBytes = 0;

  for (const state of ANIMATION_STATES) {
    converted[state] = [];
    for (const file of sortedFrames[state]) {
      try {
        const bytes = await convert(file);
        totalBytes += bytes.byteLength;
        if (totalBytes > MAX_CONVERTED_BYTES) {
          throw new AnimationPackError(
            'The converted frames are larger than the 20 MB limit.',
          );
        }
        converted[state].push(bytes);
      } catch (error) {
        if (error instanceof AnimationPackError) {
          issues.push(...error.issues);
        } else {
          issues.push(
            `${file.name}: ${
              error instanceof Error ? error.message : 'conversion failed.'
            }`,
          );
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new AnimationPackError(issues);
  }

  const animations = {} as Record<AnimationState, AnimationClip>;
  for (const state of ANIMATION_STATES) {
    animations[state] = {
      frames: converted[state].length,
      fps: selection.fps[state],
    };
  }

  const manifest: AnimationManifest = {
    formatVersion: 1,
    name,
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE,
    animations,
  };

  return { manifest, frames: converted };
}
