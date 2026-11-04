import { convertImageFileToSvg, FRAME_SIZE } from './convert';
import { t } from '../i18n';
import { ANIMATION_STATE_KEYS } from '../i18n/keys';
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
    issues.push(t('animation.error.name'));
  }

  const sortedFrames = {} as Record<AnimationState, File[]>;
  for (const state of ANIMATION_STATES) {
    const files = sortFrameFiles(selection.frames[state] ?? []);
    sortedFrames[state] = files;
    if (files.length < 1 || files.length > 24) {
      issues.push(t('animation.error.count', { state: t(ANIMATION_STATE_KEYS[state]) }));
    }

    const fps = selection.fps[state];
    if (
      typeof fps !== 'number' ||
      !Number.isInteger(fps) ||
      fps < 4 ||
      fps > 30
    ) {
      issues.push(t('animation.error.fps', { state: t(ANIMATION_STATE_KEYS[state]) }));
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
            t('animation.error.convertedTooLarge'),
          );
        }
        converted[state].push(bytes);
      } catch (error) {
        if (error instanceof AnimationPackError) {
          issues.push(...error.issues);
        } else {
          issues.push(
            t('animation.error.convertFile', {
              file: file.name,
              detail:
                error instanceof Error
                  ? error.message
                  : t('animation.error.generic'),
            }),
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
