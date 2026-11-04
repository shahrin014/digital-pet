import { describe, expect, it } from 'vitest';
import { en, ja } from './messages';

describe('message dictionaries', () => {
  it('have identical keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  });

  it('provide a non-empty value for every message', () => {
    for (const value of Object.values(ja)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
    for (const value of Object.values(en)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
