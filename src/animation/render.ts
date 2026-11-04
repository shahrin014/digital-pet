import type {
  AnimationState,
  ParsedAnimationPack,
  RenderedAnimationPack,
} from './types';
import { ANIMATION_STATES } from './types';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode an SVG frame.'));
    image.src = url;
  });
}

async function rasterizeSvgFrame(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas rendering is not available.');
    }
    const sourceWidth = image.naturalWidth || image.width || width;
    const sourceHeight = image.naturalHeight || image.height || height;
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = height - drawHeight;

    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, x, y, drawWidth, drawHeight);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderAnimationPack(
  pack: ParsedAnimationPack,
): Promise<RenderedAnimationPack> {
  const frames = {} as Record<AnimationState, HTMLCanvasElement[]>;

  await Promise.all(
    ANIMATION_STATES.map(async (state) => {
      frames[state] = await Promise.all(
        pack.frames[state].map((bytes) =>
          rasterizeSvgFrame(
            bytes,
            pack.manifest.frameWidth,
            pack.manifest.frameHeight,
          ),
        ),
      );
    }),
  );

  return {
    manifest: pack.manifest,
    frames,
  };
}
