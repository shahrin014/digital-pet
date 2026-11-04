import { describe, expect, it } from 'vitest';
import { isIosUserAgent } from './install';

describe('isIosUserAgent', () => {
  it('detects iPhone and iPad user agents', () => {
    expect(
      isIosUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'iPhone',
        5,
      ),
    ).toBe(true);
    expect(
      isIosUserAgent(
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'iPad',
        5,
      ),
    ).toBe(true);
  });

  it('detects iPadOS desktop-class user agents', () => {
    expect(
      isIosUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        'MacIntel',
        5,
      ),
    ).toBe(true);
  });

  it('does not treat desktop macOS or Android as iOS', () => {
    expect(
      isIosUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'MacIntel',
        0,
      ),
    ).toBe(false);
    expect(
      isIosUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
        'Linux armv8l',
        5,
      ),
    ).toBe(false);
  });
});
