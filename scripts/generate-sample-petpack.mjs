import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const outputDir = resolve(projectRoot, 'public', 'samples');
const outputPath = resolve(outputDir, 'example.petpack');

const frameWidth = 128;
const frameHeight = 128;

const frameCounts = {
  idle: 4,
  feed: 6,
  play: 8,
  sleep: 4,
  wake: 4,
  walk: 6,
};

const timings = {
  idle: 8,
  feed: 12,
  play: 12,
  sleep: 4,
  wake: 10,
  walk: 10,
};

function frameSvg({ dy = 0, tilt = 0, eyesClosed = false, mouthOpen = false }) {
  const eyes = eyesClosed
    ? '<path d="M50 62 q6 6 12 0 M66 62 q6 6 12 0" stroke="#593a29" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<circle cx="54" cy="62" r="3.5" fill="#593a29"/><circle cx="74" cy="62" r="3.5" fill="#593a29"/><circle cx="55" cy="60.5" r="1.2" fill="#fff0dd"/><circle cx="75" cy="60.5" r="1.2" fill="#fff0dd"/>';
  const mouth = mouthOpen
    ? '<ellipse cx="64" cy="85" rx="5" ry="4" fill="#593a29"/>'
    : '<path d="M58 83 q6 5 12 0" stroke="#593a29" stroke-width="2.5" fill="none" stroke-linecap="round"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frameWidth} ${frameHeight}">
  <g transform="translate(0 ${dy}) rotate(${tilt} 64 122)">
    <ellipse cx="64" cy="114" rx="34" ry="8" fill="#000" opacity="0.12"/>
    <path d="M40 70 L34 36 L58 56 Z" fill="#e98a4b"/>
    <path d="M88 70 L94 36 L70 56 Z" fill="#e98a4b"/>
    <path d="M44 64 L41 45 L55 58 Z" fill="#f8c9a8"/>
    <path d="M84 64 L87 45 L73 58 Z" fill="#f8c9a8"/>
    <ellipse cx="64" cy="96" rx="34" ry="30" fill="#f4a261"/>
    <ellipse cx="64" cy="104" rx="20" ry="13" fill="#fff0dd" opacity="0.55"/>
    <circle cx="64" cy="68" r="29" fill="#f4a261"/>
    <ellipse cx="64" cy="78" rx="18" ry="13" fill="#fff0dd"/>
    ${eyes}
    <path d="M60 76 h8 l-4 4 Z" fill="#593a29"/>
    ${mouth}
    <ellipse cx="44" cy="80" rx="5" ry="3" fill="#f3a3a0" opacity="0.7"/>
    <ellipse cx="84" cy="80" rx="5" ry="3" fill="#f3a3a0" opacity="0.7"/>
  </g>
</svg>`;
}

function framesFor(state) {
  const frames = [];
  for (let index = 0; index < frameCounts[state]; index += 1) {
    const phase = index / frameCounts[state];
    switch (state) {
      case 'idle':
        frames.push(
          frameSvg({ dy: Math.sin(phase * Math.PI * 2) * 2 }),
        );
        break;
      case 'feed':
        frames.push(
          frameSvg({
            dy: index % 2 === 0 ? 0 : -2,
            tilt: Math.sin(phase * Math.PI * 2) * 2,
            mouthOpen: index % 3 === 0,
          }),
        );
        break;
      case 'play':
        frames.push(
          frameSvg({
            dy: -Math.abs(Math.sin(phase * Math.PI * 2)) * 12,
            tilt: Math.sin(phase * Math.PI * 4) * 4,
            mouthOpen: true,
          }),
        );
        break;
      case 'sleep':
        frames.push(
          frameSvg({
            dy: 2 + Math.sin(phase * Math.PI * 2) * 1.5,
            tilt: 2,
            eyesClosed: true,
          }),
        );
        break;
      case 'wake':
        frames.push(
          frameSvg({
            dy: [3, -2, -5, -1][index],
            tilt: [2, 0, -2, 0][index],
            eyesClosed: index === 0,
          }),
        );
        break;
      case 'walk':
        frames.push(
          frameSvg({
            dy: index % 2 === 0 ? 0 : -3,
            tilt: Math.sin(phase * Math.PI * 2) * 2.5,
          }),
        );
        break;
    }
  }
  return frames;
}

const manifest = {
  formatVersion: 1,
  name: 'Sample Pet',
  description: 'A small bouncing fox used to try the animation pack flow.',
  frameWidth,
  frameHeight,
  animations: Object.fromEntries(
    Object.entries(frameCounts).map(([state, frames]) => [
      state,
      { frames, fps: timings[state] },
    ]),
  ),
};

const entries = {
  'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
};

for (const state of Object.keys(frameCounts)) {
  framesFor(state).forEach((svg, index) => {
    entries[`frames/${state}/${index}.svg`] = strToU8(svg);
  });
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, zipSync(entries));

console.log(`Wrote ${outputPath}`);
