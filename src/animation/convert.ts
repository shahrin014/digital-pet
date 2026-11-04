import ImageTracer from 'imagetracerjs';
import { AnimationPackError } from './errors';

export const FRAME_SIZE = 512;
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

const ACCEPTED_EXTENSION = /\.(svg|png|jpe?g|webp)$/i;
const EMBEDDED_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,/i;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = url;
  });
}

export function validateSvgSource(svgText: string, fileName: string): string[] {
  const issues: string[] = [];
  if (!/<svg\b/i.test(svgText)) {
    return [`${fileName}: missing a root <svg> element.`];
  }

  if (/<script\b/i.test(svgText)) {
    issues.push(`${fileName}: <script> elements are not allowed.`);
  }
  if (/\son[a-z]+\s*=/i.test(svgText)) {
    issues.push(`${fileName}: event-handler attributes are not allowed.`);
  }
  if (/<foreignObject\b/i.test(svgText)) {
    issues.push(`${fileName}: <foreignObject> is not allowed.`);
  }
  if (/<(?:animate|animateTransform|set)\b/i.test(svgText)) {
    issues.push(`${fileName}: SVG animation elements are not allowed.`);
  }
  if (/@keyframes\b|animation\s*:|@import\b/i.test(svgText)) {
    issues.push(`${fileName}: CSS animation and imports are not allowed.`);
  }
  if (/javascript\s*:/i.test(svgText)) {
    issues.push(`${fileName}: javascript URLs are not allowed.`);
  }
  if (/\burl\(\s*['"]?\s*(?:https?:|\/\/|data:)/i.test(svgText)) {
    issues.push(`${fileName}: external CSS URLs are not allowed.`);
  }

  for (const match of svgText.matchAll(
    /\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi,
  )) {
    const href = (match[1] ?? '').trim();
    if (!href.startsWith('#') && !EMBEDDED_IMAGE.test(href)) {
      issues.push(`${fileName}: external href references are not allowed.`);
    }
  }

  return issues;
}

export async function convertImageFileToSvg(file: File): Promise<Uint8Array> {
  if (!ACCEPTED_EXTENSION.test(file.name)) {
    throw new AnimationPackError(
      `${file.name}: use an SVG, PNG, JPEG, or WebP image.`,
    );
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AnimationPackError(
      `${file.name}: the image is larger than the 20 MB limit.`,
    );
  }

  if (file.name.toLowerCase().endsWith('.svg')) {
    const issues = validateSvgSource(await file.text(), file.name);
    if (issues.length > 0) {
      throw new AnimationPackError(issues);
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const sourceWidth = image.naturalWidth || image.width || FRAME_SIZE;
    const sourceHeight = image.naturalHeight || image.height || FRAME_SIZE;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new AnimationPackError(`${file.name}: the image has no size.`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = FRAME_SIZE;
    canvas.height = FRAME_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new AnimationPackError('Canvas rendering is not available.');
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
