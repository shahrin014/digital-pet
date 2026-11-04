import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const publicDir = resolve(projectRoot, 'public');
const iconDir = resolve(publicDir, 'icons');

const COLORS = {
  cream: [255, 246, 236, 255],
  fur: [233, 138, 75, 255],
  furDeep: [193, 99, 48, 255],
  inner: [248, 201, 168, 255],
  muzzle: [255, 240, 221, 255],
  accent: [75, 45, 31, 255],
  cheek: [243, 150, 142, 205],
  glow: [255, 245, 226, 58],
  sparkle: [255, 247, 232, 190],
  bgTop: [247, 176, 118, 255],
  bgBottom: [226, 113, 75, 255],
};

// ---------------------------------------------------------------------------
// Minimal PNG writer (RGBA, 8-bit, no dependencies).
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(
    crc32(Buffer.concat([typeBuffer, data])),
    0,
  );
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  const pixels = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    pixels.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Tiny software renderer. Shapes are drawn into a supersampled RGBA buffer and
// box-filtered down to the final size, which keeps the edges smooth.
// ---------------------------------------------------------------------------

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function blendPixel(buffer, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const index = (y * size + x) * 4;
  const srcAlpha = color[3] / 255;
  const dstAlpha = buffer[index + 3] / 255;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

  if (outAlpha === 0) {
    return;
  }

  buffer[index] = Math.round(
    (color[0] * srcAlpha + buffer[index] * dstAlpha * (1 - srcAlpha)) /
      outAlpha,
  );
  buffer[index + 1] = Math.round(
    (color[1] * srcAlpha + buffer[index + 1] * dstAlpha * (1 - srcAlpha)) /
      outAlpha,
  );
  buffer[index + 2] = Math.round(
    (color[2] * srcAlpha + buffer[index + 2] * dstAlpha * (1 - srcAlpha)) /
      outAlpha,
  );
  buffer[index + 3] = Math.round(outAlpha * 255);
}

function fillBackground(buffer, size, top, bottom) {
  for (let y = 0; y < size; y += 1) {
    const t = size <= 1 ? 0 : y / (size - 1);
    const color = [
      mix(top[0], bottom[0], t),
      mix(top[1], bottom[1], t),
      mix(top[2], bottom[2], t),
      255,
    ];
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      buffer[index] = color[0];
      buffer[index + 1] = color[1];
      buffer[index + 2] = color[2];
      buffer[index + 3] = 255;
    }
  }
}

function fillCircle(buffer, size, cx, cy, radius, color) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= radiusSquared) {
        blendPixel(buffer, size, x, y, color);
      }
    }
  }
}

function fillEllipse(buffer, size, cx, cy, rx, ry, color) {
  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(size - 1, Math.ceil(cx + rx));
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(size - 1, Math.ceil(cy + ry));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) {
        blendPixel(buffer, size, x, y, color);
      }
    }
  }
}

function fillTriangle(buffer, size, ax, ay, bx, by, cx, cy, color) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));

  const edge = (x1, y1, x2, y2, px, py) =>
    (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const e0 = edge(ax, ay, bx, by, px, py);
      const e1 = edge(bx, by, cx, cy, px, py);
      const e2 = edge(cx, cy, ax, ay, px, py);
      if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) {
        blendPixel(buffer, size, x, y, color);
      }
    }
  }
}

function drawLine(buffer, size, x1, y1, x2, y2, thickness, color) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance * 2));
  const radius = thickness / 2;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillCircle(
      buffer,
      size,
      x1 + (x2 - x1) * t,
      y1 + (y2 - y1) * t,
      radius,
      color,
    );
  }
}

function downsample(source, sourceSize, targetSize) {
  const factor = sourceSize / targetSize;
  const target = new Uint8Array(targetSize * targetSize * 4);

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;

      const startX = Math.floor(x * factor);
      const endX = Math.floor((x + 1) * factor);
      const startY = Math.floor(y * factor);
      const endY = Math.floor((y + 1) * factor);

      for (let sy = startY; sy < endY; sy += 1) {
        for (let sx = startX; sx < endX; sx += 1) {
          const index = (sy * sourceSize + sx) * 4;
          r += source[index];
          g += source[index + 1];
          b += source[index + 2];
          a += source[index + 3];
          count += 1;
        }
      }

      const index = (y * targetSize + x) * 4;
      target[index] = Math.round(r / count);
      target[index + 1] = Math.round(g / count);
      target[index + 2] = Math.round(b / count);
      target[index + 3] = Math.round(a / count);
    }
  }

  return target;
}

// ---------------------------------------------------------------------------
// Cozy pet face artwork, shared by every icon size.
// ---------------------------------------------------------------------------

function drawPetIcon(size, { maskable = false } = {}) {
  const supersample = size >= 512 ? 3 : 4;
  const canvasSize = size * supersample;
  const buffer = new Uint8Array(canvasSize * canvasSize * 4);

  fillBackground(buffer, canvasSize, COLORS.bgTop, COLORS.bgBottom);

  const at = (value) => value * canvasSize;
  const headCx = at(0.5);
  const headCy = at(maskable ? 0.535 : 0.55);
  const headRx = at(maskable ? 0.225 : 0.275);
  const headRy = headRx * 0.88;
  const earScale = maskable ? 0.84 : 1;

  // Soft glow and a few tiny sparkles in the full-bleed background.
  fillCircle(
    buffer,
    canvasSize,
    at(0.5),
    at(0.5),
    at(0.43),
    COLORS.glow,
  );
  fillCircle(buffer, canvasSize, at(0.22), at(0.24), at(0.012), COLORS.sparkle);
  fillCircle(buffer, canvasSize, at(0.77), at(0.22), at(0.017), COLORS.sparkle);
  fillCircle(buffer, canvasSize, at(0.78), at(0.72), at(0.011), COLORS.sparkle);
  fillCircle(buffer, canvasSize, at(0.22), at(0.72), at(0.008), COLORS.sparkle);

  // Tail sits behind the head.
  fillCircle(
    buffer,
    canvasSize,
    headCx + headRx * (maskable ? 0.92 : 0.98),
    headCy + headRy * 0.62,
    headRx * 0.3,
    COLORS.fur,
  );
  fillCircle(
    buffer,
    canvasSize,
    headCx + headRx * (maskable ? 1.06 : 1.12),
    headCy + headRy * 0.48,
    headRx * 0.16,
    COLORS.muzzle,
  );

  // Ears.
  const leftEar = [
    headCx - headRx * 0.62 * earScale,
    headCy - headRy * 0.64,
    headCx - headRx * 0.62 * earScale,
    headCy - headRy * 1.48,
    headCx - headRx * 0.06 * earScale,
    headCy - headRy * 0.92,
  ];
  const rightEar = [
    headCx + headRx * 0.62 * earScale,
    headCy - headRy * 0.64,
    headCx + headRx * 0.62 * earScale,
    headCy - headRy * 1.48,
    headCx + headRx * 0.06 * earScale,
    headCy - headRy * 0.92,
  ];
  fillTriangle(buffer, canvasSize, ...leftEar, COLORS.furDeep);
  fillTriangle(buffer, canvasSize, ...rightEar, COLORS.furDeep);

  fillTriangle(
    buffer,
    canvasSize,
    headCx - headRx * 0.51 * earScale,
    headCy - headRy * 0.75,
    headCx - headRx * 0.51 * earScale,
    headCy - headRy * 1.26,
    headCx - headRx * 0.18 * earScale,
    headCy - headRy * 0.9,
    COLORS.inner,
  );
  fillTriangle(
    buffer,
    canvasSize,
    headCx + headRx * 0.51 * earScale,
    headCy - headRy * 0.75,
    headCx + headRx * 0.51 * earScale,
    headCy - headRy * 1.26,
    headCx + headRx * 0.18 * earScale,
    headCy - headRy * 0.9,
    COLORS.inner,
  );

  // Head and muzzle.
  fillEllipse(buffer, canvasSize, headCx, headCy, headRx, headRy, COLORS.fur);
  fillEllipse(
    buffer,
    canvasSize,
    headCx,
    headCy + headRy * 0.36,
    headRx * 0.46,
    headRy * 0.42,
    COLORS.muzzle,
  );

  // Cheeks.
  fillEllipse(
    buffer,
    canvasSize,
    headCx - headRx * 0.58,
    headCy + headRy * 0.24,
    headRx * 0.15,
    headRy * 0.1,
    COLORS.cheek,
  );
  fillEllipse(
    buffer,
    canvasSize,
    headCx + headRx * 0.58,
    headCy + headRy * 0.24,
    headRx * 0.15,
    headRy * 0.1,
    COLORS.cheek,
  );

  // Eyes with highlights.
  const eyeOffsetX = headRx * 0.38;
  const eyeY = headCy - headRy * 0.17;
  const eyeRadius = headRx * 0.105;
  fillCircle(buffer, canvasSize, headCx - eyeOffsetX, eyeY, eyeRadius, COLORS.accent);
  fillCircle(buffer, canvasSize, headCx + eyeOffsetX, eyeY, eyeRadius, COLORS.accent);
  fillCircle(
    buffer,
    canvasSize,
    headCx - eyeOffsetX + eyeRadius * 0.34,
    eyeY - eyeRadius * 0.34,
    eyeRadius * 0.28,
    COLORS.muzzle,
  );
  fillCircle(
    buffer,
    canvasSize,
    headCx + eyeOffsetX + eyeRadius * 0.34,
    eyeY - eyeRadius * 0.34,
    eyeRadius * 0.28,
    COLORS.muzzle,
  );

  // Nose and small smile.
  const noseY = headCy + headRy * 0.22;
  fillTriangle(
    buffer,
    canvasSize,
    headCx - headRx * 0.095,
    noseY,
    headCx + headRx * 0.095,
    noseY,
    headCx,
    noseY + headRy * 0.09,
    COLORS.accent,
  );
  drawLine(
    buffer,
    canvasSize,
    headCx,
    noseY + headRy * 0.22,
    headCx - headRx * 0.13,
    noseY + headRy * 0.14,
    canvasSize * 0.007,
    COLORS.accent,
  );
  drawLine(
    buffer,
    canvasSize,
    headCx,
    noseY + headRy * 0.22,
    headCx + headRx * 0.13,
    noseY + headRy * 0.14,
    canvasSize * 0.007,
    COLORS.accent,
  );

  return downsample(buffer, canvasSize, size);
}

// ---------------------------------------------------------------------------
// Output.
// ---------------------------------------------------------------------------

function writeIcon(fileName, size, options) {
  const rgba = drawPetIcon(size, options);
  writeFileSync(resolve(iconDir, fileName), encodePng(size, rgba));
}

mkdirSync(iconDir, { recursive: true });

writeIcon('icon-192.png', 192);
writeIcon('icon-512.png', 512);
writeIcon('icon-maskable-512.png', 512, { maskable: true });
writeIcon('apple-touch-icon.png', 180);

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Digital Pet">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7b076"/>
      <stop offset="1" stop-color="#e2714b"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <circle cx="32" cy="33" r="23" fill="#fff5e2" opacity="0.18"/>
  <path d="M20 30 L18 13 L29 23 Z" fill="#c16330"/>
  <path d="M44 30 L46 13 L35 23 Z" fill="#c16330"/>
  <path d="M22 27 L21 18 L27 24 Z" fill="#f8c9a8"/>
  <path d="M42 27 L43 18 L37 24 Z" fill="#f8c9a8"/>
  <ellipse cx="32" cy="35" rx="17" ry="15" fill="#e98a4b"/>
  <ellipse cx="32" cy="41" rx="8" ry="6.2" fill="#fff0dd"/>
  <ellipse cx="24" cy="41" rx="2.8" ry="1.8" fill="#f3968e" opacity="0.7"/>
  <ellipse cx="40" cy="41" rx="2.8" ry="1.8" fill="#f3968e" opacity="0.7"/>
  <circle cx="26" cy="34" r="2" fill="#4b2d1f"/>
  <circle cx="38" cy="34" r="2" fill="#4b2d1f"/>
  <circle cx="26.7" cy="33.3" r="0.6" fill="#fff6ec"/>
  <circle cx="38.7" cy="33.3" r="0.6" fill="#fff6ec"/>
  <path d="M29.6 39.8 h4.8 l-2.4 2.5 Z" fill="#4b2d1f"/>
  <path d="M32 42.3 q-2.2 2.4 -4.4 0.7 M32 42.3 q2.2 2.4 4.4 0.7" fill="none" stroke="#4b2d1f" stroke-width="1.1" stroke-linecap="round"/>
</svg>
`;

writeFileSync(resolve(publicDir, 'favicon.svg'), favicon);

process.stdout.write(
  'Generated public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png and public/favicon.svg\n',
);
