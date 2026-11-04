import { describe, expect, it } from 'vitest';
import { validateSvgSource } from './convert';
import { AnimationPackError } from './errors';
import {
  DEFAULT_FPS,
  parseAnimationSelection,
  type AnimationSelection,
  type FrameConverter,
} from './selection';
import type { AnimationState } from './types';
import { ANIMATION_STATES } from './types';

const decoder = new TextDecoder();

function file(name: string): File {
  return new File([name], name, { type: 'image/png' });
}

function filesFor(
  state: AnimationState,
  count: number,
  names?: string[],
): File[] {
  return Array.from({ length: count }, (_, index) =>
    file(names?.[index] ?? `${state}-${index}.png`),
  );
}

function selection(overrides: Partial<AnimationSelection> = {}): AnimationSelection {
  const frames = Object.fromEntries(
    ANIMATION_STATES.map((state) => [state, filesFor(state, 1)]),
  ) as Record<AnimationState, File[]>;
  const fps = { ...DEFAULT_FPS };
  return { name: 'Mochi', frames, fps, ...overrides };
}

const fakeConvert: FrameConverter = async (source) =>
  new TextEncoder().encode(source.name);

async function expectIssues(
  input: AnimationSelection,
  pattern: RegExp,
  convert: FrameConverter = fakeConvert,
): Promise<void> {
  try {
    await parseAnimationSelection(input, convert);
  } catch (error) {
    expect(error).toBeInstanceOf(AnimationPackError);
    expect((error as AnimationPackError).issues.join(' ')).toMatch(pattern);
    return;
  }
  throw new Error('Expected the selection to be rejected');
}

describe('parseAnimationSelection', () => {
  it('accepts one or more frames per activity', async () => {
    const parsed = await parseAnimationSelection(selection(), fakeConvert);

    expect(parsed.manifest.name).toBe('Mochi');
    expect(parsed.manifest.frameWidth).toBe(512);
    expect(parsed.manifest.frameHeight).toBe(512);
    for (const state of ANIMATION_STATES) {
      expect(parsed.frames[state]).toHaveLength(1);
    }
  });

  it('sorts frames by filename in numeric order', async () => {
    const input = selection();
    input.frames.idle = [
      file('10.png'),
      file('2.png'),
      file('1.png'),
    ];

    const parsed = await parseAnimationSelection(input, fakeConvert);

    expect(parsed.frames.idle.map((bytes) => decoder.decode(bytes))).toEqual([
      '1.png',
      '2.png',
      '10.png',
    ]);
  });

  it('trims the animation name', async () => {
    const parsed = await parseAnimationSelection(
      selection({ name: '  Mochi  ' }),
      fakeConvert,
    );

    expect(parsed.manifest.name).toBe('Mochi');
  });

  it('rejects an empty activity', async () => {
    const input = selection();
    input.frames.walk = [];

    await expectIssues(input, /walk: select between 1 and 24 frames/);
  });

  it('rejects too many frames', async () => {
    const input = selection();
    input.frames.play = filesFor('play', 25);

    await expectIssues(input, /play: select between 1 and 24 frames/);
  });

  it('rejects an invalid name', async () => {
    await expectIssues(
      selection({ name: '   ' }),
      /Animation name must be between 1 and 32 characters/,
    );
  });

  it('rejects invalid FPS', async () => {
    const input = selection();
    input.fps.idle = 2;

    await expectIssues(input, /idle: FPS must be an integer between 4 and 30/);
  });

  it('reports converter errors with the source filename', async () => {
    const failing: FrameConverter = async (source) => {
      if (source.name === 'feed-0.png') {
        throw new AnimationPackError('feed-0.png: could not decode');
      }
      return new TextEncoder().encode(source.name);
    };

    await expectIssues(
      selection(),
      /feed-0\.png: could not decode/,
      failing,
    );
  });
});

describe('validateSvgSource', () => {
  const safe = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

  it('accepts a safe SVG', () => {
    expect(validateSvgSource(safe, 'safe.svg')).toEqual([]);
  });

  it('accepts an embedded raster image', () => {
    const svg =
      '<svg viewBox="0 0 10 10"><image href="data:image/png;base64,AA==" width="10" height="10"/></svg>';

    expect(validateSvgSource(svg, 'embedded.svg')).toEqual([]);
  });

  it('rejects scripts and external references', () => {
    expect(
      validateSvgSource(`${safe}<script>alert(1)</script>`, 'bad.svg'),
    ).not.toEqual([]);
    expect(
      validateSvgSource(
        '<svg><image href="https://example.com/a.png"/></svg>',
        'bad.svg',
      ),
    ).not.toEqual([]);
  });

  it('rejects foreignObject and SVG animation', () => {
    expect(
      validateSvgSource('<svg><foreignObject><div/></foreignObject></svg>', 'bad.svg'),
    ).not.toEqual([]);
    expect(
      validateSvgSource(
        '<svg><animate attributeName="x" values="0;1"/></svg>',
        'bad.svg',
      ),
    ).not.toEqual([]);
  });

  it('rejects CSS imports and animation', () => {
    expect(
      validateSvgSource('<svg><style>@import "https://x";</style></svg>', 'bad.svg'),
    ).not.toEqual([]);
    expect(
      validateSvgSource(
        '<svg><style>@keyframes x { from { opacity: 0 } }</style></svg>',
        'bad.svg',
      ),
    ).not.toEqual([]);
  });
});
