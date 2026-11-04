import { strToU8, zipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AnimationPackError,
  MAX_PACK_BYTES,
  parsePetPackBytes,
  validateSvgFrame,
} from './pack';
import type { AnimationManifest } from './types';
import { ANIMATION_STATES } from './types';

const FRAME_COUNTS = {
  idle: 4,
  feed: 6,
  play: 8,
  sleep: 4,
  wake: 4,
  walk: 6,
};

function validManifest(): AnimationManifest {
  return {
    formatVersion: 1,
    name: 'Mochi',
    description: 'A test pack',
    frameWidth: 128,
    frameHeight: 128,
    animations: {
      idle: { frames: 4, fps: 8 },
      feed: { frames: 6, fps: 12 },
      play: { frames: 8, fps: 12 },
      sleep: { frames: 4, fps: 4 },
      wake: { frames: 4, fps: 10 },
      walk: { frames: 6, fps: 10 },
    },
  };
}

function frameSvg(viewBox = '0 0 128 128'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><circle cx="64" cy="64" r="32" fill="#f4a261"/></svg>`;
}

function entriesFor(
  manifest: AnimationManifest,
  frameForState: (state: string, index: number) => string = () => frameSvg(),
): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest)),
  };
  for (const state of ANIMATION_STATES) {
    for (let index = 0; index < FRAME_COUNTS[state]; index += 1) {
      entries[`frames/${state}/${index}.svg`] = strToU8(
        frameForState(state, index),
      );
    }
  }
  return entries;
}

function expectPackIssues(
  entries: Record<string, Uint8Array>,
  pattern: RegExp,
): void {
  try {
    parsePetPackBytes(zipSync(entries));
  } catch (error) {
    expect(error).toBeInstanceOf(AnimationPackError);
    expect((error as AnimationPackError).issues.join(' ')).toMatch(pattern);
    return;
  }
  throw new Error('Expected the pack to be rejected');
}

describe('parsePetPackBytes', () => {
  it('accepts a valid pack and preserves frame order', () => {
    const manifest = validManifest();
    const parsed = parsePetPackBytes(zipSync(entriesFor(manifest)));

    expect(parsed.manifest.name).toBe('Mochi');
    for (const state of ANIMATION_STATES) {
      expect(parsed.frames[state]).toHaveLength(FRAME_COUNTS[state]);
    }
  });

  it('accepts the bundled sample pack', () => {
    const bytes = readFileSync(
      new URL('../../public/samples/example.petpack', import.meta.url),
    );
    const parsed = parsePetPackBytes(new Uint8Array(bytes));

    expect(parsed.manifest.name).toBe('Sample Pet');
    expect(parsed.frames.idle).toHaveLength(4);
    expect(parsed.frames.play).toHaveLength(8);
  });

  it('applies default FPS when it is omitted', () => {
    const manifest = validManifest();
    for (const state of ANIMATION_STATES) {
      delete (manifest.animations[state] as { fps?: number }).fps;
    }

    const parsed = parsePetPackBytes(zipSync(entriesFor(manifest)));

    expect(parsed.manifest.animations.idle.fps).toBe(8);
    expect(parsed.manifest.animations.feed.fps).toBe(12);
    expect(parsed.manifest.animations.play.fps).toBe(12);
    expect(parsed.manifest.animations.sleep.fps).toBe(4);
    expect(parsed.manifest.animations.wake.fps).toBe(10);
    expect(parsed.manifest.animations.walk.fps).toBe(10);
  });

  it('rejects a missing animation state', () => {
    const manifest = validManifest();
    const animations = { ...manifest.animations };
    delete (animations as Partial<typeof animations>).walk;
    const entries = entriesFor(manifest);
    entries['manifest.json'] = strToU8(
      JSON.stringify({ ...manifest, animations }),
    );

    expectPackIssues(entries, /animations\.walk is required/);
  });

  it('rejects a missing frame', () => {
    const entries = entriesFor(validManifest());
    delete entries['frames/idle/3.svg'];

    expectPackIssues(entries, /Missing file "frames\/idle\/3\.svg"/);
  });

  it('rejects an extra file', () => {
    const entries = entriesFor(validManifest());
    entries['README.md'] = strToU8('hello');

    expectPackIssues(entries, /Unexpected file "README\.md"/);
  });

  it('rejects a frame with the wrong viewBox', () => {
    const entries = entriesFor(validManifest(), (state, index) =>
      state === 'play' && index === 2 ? frameSvg('0 0 64 64') : frameSvg(),
    );

    expectPackIssues(entries, /viewBox must be "0 0 128 128"/);
  });

  it('rejects a frame with a script', () => {
    const entries = entriesFor(validManifest(), (state, index) =>
      state === 'feed' && index === 1
        ? frameSvg().replace('</svg>', '<script>alert(1)</script></svg>')
        : frameSvg(),
    );

    expectPackIssues(entries, /<script> elements are not allowed/);
  });

  it('rejects external hrefs', () => {
    const entries = entriesFor(validManifest(), (state, index) =>
      state === 'walk' && index === 0
        ? frameSvg().replace(
            '</svg>',
            '<use href="https://example.com/a.svg#x"/></svg>',
          )
        : frameSvg(),
    );

    expectPackIssues(entries, /external href references are not allowed/);
  });

  it('rejects SVG animation elements', () => {
    const entries = entriesFor(validManifest(), (state, index) =>
      state === 'sleep' && index === 0
        ? frameSvg().replace(
            '</svg>',
            '<animate attributeName="opacity" values="0;1"/></svg>',
          )
        : frameSvg(),
    );

    expectPackIssues(entries, /SVG animation elements are not allowed/);
  });

  it('rejects foreignObject and embedded images', () => {
    const entries = entriesFor(validManifest(), (state, index) => {
      if (state === 'idle' && index === 0) {
        return frameSvg().replace(
          '</svg>',
          '<foreignObject><div>hello</div></foreignObject></svg>',
        );
      }
      if (state === 'idle' && index === 1) {
        return frameSvg().replace(
          '</svg>',
          '<image href="data:image/png;base64,abc"/></svg>',
        );
      }
      return frameSvg();
    });

    expectPackIssues(entries, /foreignObject|embedded <image>/);
  });

  it('rejects too many frames before reading frame files', () => {
    const manifest = validManifest();
    manifest.animations.play.frames = 25;
    const entries = entriesFor(manifest);

    expectPackIssues(entries, /animations\.play\.frames must be between 1 and 24/);
  });

  it('rejects invalid FPS', () => {
    const manifest = validManifest();
    manifest.animations.play.fps = 2;
    expectPackIssues(
      entriesFor(manifest),
      /animations\.play\.fps must be between 4 and 30/,
    );
  });

  it('rejects malformed JSON', () => {
    const entries = entriesFor(validManifest());
    entries['manifest.json'] = strToU8('{nope');

    expectPackIssues(entries, /manifest\.json is not valid JSON/);
  });

  it('rejects non-ZIP input', () => {
    expect(() => parsePetPackBytes(strToU8('not a zip'))).toThrow(
      AnimationPackError,
    );
  });

  it('rejects packs above the compressed limit', () => {
    expect(() =>
      parsePetPackBytes(new Uint8Array(MAX_PACK_BYTES + 1)),
    ).toThrow(/5 MB compressed limit/);
  });
});

describe('validateSvgFrame', () => {
  it('allows internal fragment references and safe CSS URLs', () => {
    const svg = frameSvg().replace(
      '</svg>',
      '<defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><rect fill="url(#g)" width="10" height="10"/></svg>',
    );

    expect(validateSvgFrame(svg, validManifest())).toEqual([]);
  });

  it('rejects CSS keyframe animation', () => {
    const svg = frameSvg().replace(
      '</svg>',
      '<style>@keyframes x { from { opacity: 0 } }</style></svg>',
    );

    expect(validateSvgFrame(svg, validManifest())).not.toEqual([]);
  });
});
