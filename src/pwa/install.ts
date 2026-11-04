export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export const INSTALL_DISMISS_KEY = 'digital-pet.install-dismissed.v1';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function isIosUserAgent(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): boolean {
  const ios = /iPad|iPhone|iPod/i.test(userAgent);
  const ipadOs =
    /Macintosh/i.test(userAgent) &&
    platform === 'MacIntel' &&
    maxTouchPoints > 1;
  return ios || ipadOs;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const standalone = (
    navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    standalone === true
  );
}

export function wasInstallBannerDismissed(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (!raw) {
      return false;
    }
    const dismissedAt = Number(raw);
    return (
      Number.isFinite(dismissedAt) &&
      now - dismissedAt >= 0 &&
      now - dismissedAt < DISMISS_DURATION_MS
    );
  } catch {
    return false;
  }
}

export function dismissInstallBanner(now = Date.now()): void {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(now));
  } catch {
    // The banner still stays dismissed for this session.
  }
}
