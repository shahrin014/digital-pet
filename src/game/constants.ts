import type { Preferences } from './types';

export const NEED_MIN = 0;
export const NEED_MAX = 100;
export const INITIAL_NEED = 80;
export const NAME_MAX_LENGTH = 24;

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const WALK_DURATION_MS = 5 * MINUTE_MS;
export const CATCH_UP_MAX_MS = 24 * HOUR_MS;

export const REMINDER_THRESHOLD = 30;
export const REMINDER_INTERVAL_MS = 2 * HOUR_MS;

export const QUIET_HOURS_DEFAULT = {
  enabled: true,
  start: '22:00',
  end: '08:00',
} as const;

export const DEFAULT_PREFERENCES: Preferences = {
  browserNotifications: false,
  quietHoursEnabled: QUIET_HOURS_DEFAULT.enabled,
  quietStart: QUIET_HOURS_DEFAULT.start,
  quietEnd: QUIET_HOURS_DEFAULT.end,
};

export const AWAKE_DECAY_PER_HOUR = {
  fullness: 4,
  energy: 3,
  happiness: 2,
} as const;

export const SLEEP_ENERGY_PER_HOUR = 10;
export const SLEEP_DECAY_PER_HOUR = {
  fullness: 2,
  happiness: 1,
} as const;

export const FEED = {
  fullness: 35,
  happiness: 5,
  maxFullness: 95,
} as const;

export const PLAY = {
  happiness: 20,
  energyCost: 10,
  fullnessCost: 5,
  minEnergy: 15,
} as const;

export const WALK = {
  happiness: 30,
  energyCost: 20,
  fullnessCost: 10,
  minEnergy: 25,
} as const;

export const MOOD_THRESHOLDS = {
  low: 30,
  medium: 60,
} as const;
