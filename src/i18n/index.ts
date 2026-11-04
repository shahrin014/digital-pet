import { useSyncExternalStore } from 'react';
import { en, ja, type Locale, type MessageKey } from './messages';

const listeners = new Set<() => void>();
let currentLocale: Locale = 'ja';

if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLocale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) {
    return;
  }
  currentLocale = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => 'ja');
}

export function formatMessage(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : match,
  );
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dictionary = currentLocale === 'ja' ? ja : en;
  return formatMessage(dictionary[key] ?? ja[key], params);
}

export function useTranslation(): {
  locale: Locale;
  t: typeof t;
} {
  const locale = useLocale();
  return { locale, t };
}

export function formatList(items: string[], locale: Locale = currentLocale): string {
  if (items.length === 0) {
    return '';
  }
  if (typeof Intl !== 'undefined' && 'ListFormat' in Intl) {
    return new Intl.ListFormat(locale, {
      style: 'long',
      type: 'conjunction',
    }).format(items);
  }
  return items.join(locale === 'ja' ? '、' : ', ');
}

export function formatPercent(
  value: number,
  locale: Locale = currentLocale,
): string {
  if (typeof Intl !== 'undefined') {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value / 100);
  }
  return `${Math.round(value)}%`;
}

export type { Locale, MessageKey };
