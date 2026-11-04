import type { Activity } from '../game/types';

export const ANIMATION_STATES = [
  'idle',
  'feed',
  'play',
  'sleep',
  'wake',
  'walk',
] as const;

export type AnimationState = (typeof ANIMATION_STATES)[number];

export const TRANSIENT_ANIMATIONS = ['feed', 'play', 'wake'] as const;
export type TransientAnimationState = (typeof TRANSIENT_ANIMATIONS)[number];

export const ANIMATION_LABELS: Record<AnimationState, string> = {
  idle: 'idle',
  feed: 'feeding',
  play: 'playing',
  sleep: 'sleeping',
  wake: 'waking up',
  walk: 'walking',
};

export interface AnimationTiming {
  frames: number;
  fps: number;
  frameDurationMs: number;
  totalMs: number;
  loop: boolean;
}

export const ANIMATION_TIMINGS: Record<AnimationState, AnimationTiming> = {
  idle: {
    frames: 4,
    fps: 8,
    frameDurationMs: 125,
    totalMs: 500,
    loop: true,
  },
  feed: {
    frames: 6,
    fps: 12,
    frameDurationMs: 1000 / 12,
    totalMs: 500,
    loop: false,
  },
  play: {
    frames: 8,
    fps: 12,
    frameDurationMs: 1000 / 12,
    totalMs: (8 * 1000) / 12,
    loop: false,
  },
  sleep: {
    frames: 4,
    fps: 4,
    frameDurationMs: 250,
    totalMs: 1000,
    loop: true,
  },
  wake: {
    frames: 4,
    fps: 10,
    frameDurationMs: 100,
    totalMs: 400,
    loop: false,
  },
  walk: {
    frames: 6,
    fps: 10,
    frameDurationMs: 100,
    totalMs: 600,
    loop: true,
  },
};

export interface AnimationClip {
  frames: number;
  fps: number;
}

export interface AnimationManifest {
  formatVersion: 1;
  name: string;
  description?: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<AnimationState, AnimationClip>;
}

export interface ParsedAnimationPack {
  manifest: AnimationManifest;
  frames: Record<AnimationState, Uint8Array[]>;
}

export interface StoredAnimationPack extends ParsedAnimationPack {
  appliedAt: number;
}

export interface RenderedAnimationPack {
  manifest: AnimationManifest;
  frames: Record<AnimationState, HTMLCanvasElement[]>;
}

export function isAnimationState(value: unknown): value is AnimationState {
  return (
    typeof value === 'string' &&
    (ANIMATION_STATES as readonly string[]).includes(value)
  );
}

export function isTransientAnimation(
  value: AnimationState,
): value is TransientAnimationState {
  return (TRANSIENT_ANIMATIONS as readonly string[]).includes(value);
}

export function persistentAnimationFor(activity: Activity): AnimationState {
  switch (activity) {
    case 'sleeping':
      return 'sleep';
    case 'walking':
      return 'walk';
    case 'awake':
      return 'idle';
  }
}

export function timingForState(
  state: AnimationState,
  manifest?: AnimationManifest | null,
): AnimationTiming {
  const builtIn = ANIMATION_TIMINGS[state];
  if (!manifest) {
    return builtIn;
  }

  const clip = manifest.animations[state];
  const frameDurationMs = 1000 / clip.fps;
  return {
    frames: clip.frames,
    fps: clip.fps,
    frameDurationMs,
    totalMs: clip.frames * frameDurationMs,
    loop: builtIn.loop,
  };
}
