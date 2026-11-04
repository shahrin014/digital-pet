import ImageTracer from 'imagetracerjs';
import { t } from '../i18n';
import { AnimationPackError } from './errors';

export const FRAME_SIZE = 512;
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

const ACCEPTED_EXTENSION = /\.(svg|png|jpe?g|webp)$/i;
const EMBEDDED_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,/i;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t('animation.error.image.decode')));
    image.src = url;
  });
}

export function validateSvgSource(svgText: string, fileName: string): string[] {
  const issues: string[] = [];
  if (!/<svg\b/i.test(svgText)) {
    return [t('animation.error.svg.root', { file: fileName })];
  }

  if (/<script\b/i.test(svgText)) {
    issues.push(t('animation.error.svg.script', { file: fileName }));
  }
  if (/\son[a-z]+\s*=/i.test(svgText)) {
    issues.push(t('animation.error.svg.event', { file: fileName }));
  }
  if (/<foreignObject\b/i.test(svgText)) {
    issues.push(t('animation.error.svg.foreignObject', { file: fileName }));
  }
  if (/<(?:animate|animateTransform|set)\b/i.test(svgText)) {
    issues.push(t('animation.error.svg.animation', { file: fileName }));
  }
  if (/@keyframes\b|animation\s*:|@import\b/i.test(svgText)) {
    issues.push(t('animation.error.svg.css', { file: fileName }));
  }
  if (/javascript\s*:/i.test(svgText)) {
    issues.push(t('animation.error.svg.javascript', { file: fileName }));
  }
  if (/\burl\(\s*['"]?\s*(?:https?:|\/\/|data:)/i.test(svgText)) {
    issues.push(t('animation.error.svg.externalUrl', { file: fileName }));
  }

  for (const match of svgText.matchAll(
    /\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi,
  )) {
    const href = (match[1] ?? '').trim();
    if (!href.startsWith('#') && !EMBEDDED_IMAGE.test(href)) {
      issues.push(t('animation.error.svg.href', { file: fileName }));
    }
  }

  return issues;
}

export async function convertImageFileToSvg(file: File): Promise<Uint8Array> {
  if (!ACCEPTED_EXTENSION.test(file.name)) {
    throw new AnimationPackError(
      t('animation.error.image.unsupported', { file: file.name }),
    );
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AnimationPackError(
      t('animation.error.image.tooLarge', { file: file.name }),
    );
  }

  if (file.name.toLowerCase().endsWith('.svg')) {
    const text = await file.text();
    const issues = validateSvgSource(text, file.name);
    if (issues.length > 0) {
      throw new AnimationPackError(issues);
    }
    return new TextEncoder().encode(text);
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const sourceWidth = image.naturalWidth || image.width || FRAME_SIZE;
    const sourceHeight = image.naturalHeight || image.height || FRAME_SIZE;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new AnimationPackError(t('animation.error.image.noSize', { file: file.name }));
    }

    const canvas = document.createElement('canvas');
    canvas.width = FRAME_SIZE;
    canvas.height = FRAME_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new AnimationPackError(t('animation.error.canvas'));
    }

    const scale = Math.min(
      FRAME_SIZE / sourceWidth,
      FRAME_SIZE / sourceHeight,
    );
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = (FRAME_SIZE - drawWidth) / 2;
    const y = FRAME_SIZE - drawHeight;

    context.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, x, y, drawWidth, drawHeight);

    const imageData = context.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE);
    const svg = ImageTracer.imagedataToSVG(imageData, {
      numberofcolors: 16,
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      rightangleenhance: true,
      colorsampling: 2,
      mincolorratio: 0,
      colorquantcycles: 3,
      layering: 0,
      strokewidth: 1,
      linefilter: false,
      scale: 1,
      roundcoords: 1,
      viewbox: true,
      desc: false,
    });

    return new TextEncoder().encode(svg);
  } finally {
    URL.revokeObjectURL(url);
  }
}
