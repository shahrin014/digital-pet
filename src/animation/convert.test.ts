import { describe, expect, it } from 'vitest';
import { convertImageFileToSvg } from './convert';
import { AnimationPackError } from './errors';

function svgFile(source: string, name = 'pet.svg'): File {
  return new File([source], name, { type: 'image/svg+xml' });
}

describe('convertImageFileToSvg', () => {
  it('stores a safe SVG source unchanged', async () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="40" fill="#f4a261"/></svg>';

    const bytes = await convertImageFileToSvg(svgFile(source));

    expect(new TextDecoder().decode(bytes)).toBe(source);
  });

  it('validates SVG sources before storing them', async () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

    await expect(convertImageFileToSvg(svgFile(source))).rejects.toBeInstanceOf(
      AnimationPackError,
    );
  });

  it('rejects unsupported file formats', async () => {
    const file = new File(['GIF89a'], 'pet.gif', { type: 'image/gif' });

    await expect(convertImageFileToSvg(file)).rejects.toBeInstanceOf(
      AnimationPackError,
    );
  });
});
