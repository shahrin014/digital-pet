import { describe, expect, it } from 'vitest';
import type { AnimationManifest } from './types';
import {
  ANIMATION_TIMINGS,
  persistentAnimationFor,
  timingForState,
} from './types';

describe('animation timing', () => {
  it('maps persistent activities to animation states', () => {
    expect(persistentAnimationFor('awake')).toBe('idle');
    expect(persistentAnimationFor('sleeping')).toBe('sleep');
    expect(persistentAnimationFor('walking')).toBe('walk');
  });

  it('uses the built-in frame counts and timings', () => {
    expect(ANIMATION_TIMINGS.idle).toMatchObject({
      frames: 4,
      fps: 8,
      totalMs: 500,
      loop: true,
    });
    expect(ANIMATION_TIMINGS.feed).toMatchObject({
      frames: 6,
      fps: 12,
      totalMs: 500,
      loop: false,
    });
    expect(ANIMATION_TIMINGS.play).toMatchObject({
      frames: 8,
      fps: 12,
      loop: false,
    });
    expect(ANIMATION_TIMINGS.sleep).toMatchObject({
      frames: 4,
      fps: 4,
      totalMs: 1000,
      loop: true,
    });
    expect(ANIMATION_TIMINGS.wake).toMatchObject({
      frames: 4,
      fps: 10,
      totalMs: 400,
      loop: false,
    });
    expect(ANIMATION_TIMINGS.walk).toMatchObject({
      frames: 6,
      fps: 10,
      totalMs: 600,
      loop: true,
    });
  });

  it('uses manifest frame counts and FPS for a custom pack', () => {
    const manifest: AnimationManifest = {
      formatVersion: 1,
      name: 'Mochi',
      frameWidth: 128,
      frameHeight: 128,
      animations: {
        idle: { frames: 2, fps: 5 },
        feed: { frames: 3, fps: 10 },
        play: { frames: 4, fps: 20 },
        sleep: { frames: 2, fps: 4 },
        wake: { frames: 2, fps: 5 },
        walk: { frames: 5, fps: 10 },
      },
    };

    expect(timingForState('feed', manifest)).toMatchObject({
      frames: 3,
      fps: 10,
      totalMs: 300,
      loop: false,
    });
    expect(timingForState('walk', manifest)).toMatchObject({
      frames: 5,
      fps: 10,
      totalMs: 500,
      loop: true,
    });
  });
});
