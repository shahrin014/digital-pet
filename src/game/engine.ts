import {
  AWAKE_DECAY_PER_HOUR,
  CATCH_UP_MAX_MS,
  FEED,
  HOUR_MS,
  INITIAL_NEED,
  MOOD_THRESHOLDS,
  NEED_MAX,
  NEED_MIN,
  PLAY,
  SLEEP_DECAY_PER_HOUR,
  SLEEP_ENERGY_PER_HOUR,
  WALK,
  WALK_DURATION_MS,
  NAME_MAX_LENGTH,
} from './constants';
import type {
  ActionType,
  ActionResult,
  Availability,
  Mood,
  Pet,
  Preferences,
  Species,
} from './types';

const MINUTES_PER_DAY = 24 * 60;

export function clampNeed(value: number): number {
  return Math.min(NEED_MAX, Math.max(NEED_MIN, value));
}

function createId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `pet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Please give your pet a name.';
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Names can be at most ${NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export function createPet(
  name: string,
  species: Species,
  now: number = Date.now(),
): Pet {
  const safeNow = Number.isFinite(now) ? now : Date.now();
  return {
    id: createId(),
    name: name.trim(),
    species,
    createdAt: safeNow,
    fullness: INITIAL_NEED,
    energy: INITIAL_NEED,
    happiness: INITIAL_NEED,
    activity: 'awake',
    lastUpdatedAt: safeNow,
    walkDurationMs: WALK_DURATION_MS,
  };
}

function applyAwakeDecay(pet: Pet, elapsedMs: number): Pet {
  const hours = elapsedMs / HOUR_MS;
  return {
    ...pet,
    fullness: clampNeed(pet.fullness - AWAKE_DECAY_PER_HOUR.fullness * hours),
    energy: clampNeed(pet.energy - AWAKE_DECAY_PER_HOUR.energy * hours),
    happiness: clampNeed(pet.happiness - AWAKE_DECAY_PER_HOUR.happiness * hours),
  };
}

function applySleepDecay(pet: Pet, elapsedMs: number): Pet {
  const hours = elapsedMs / HOUR_MS;
  return {
    ...pet,
    fullness: clampNeed(pet.fullness - SLEEP_DECAY_PER_HOUR.fullness * hours),
    energy: clampNeed(pet.energy + SLEEP_ENERGY_PER_HOUR * hours),
    happiness: clampNeed(pet.happiness - SLEEP_DECAY_PER_HOUR.happiness * hours),
  };
}

function applyWalkEffects(pet: Pet): Pet {
  return {
    ...pet,
    fullness: clampNeed(pet.fullness - WALK.fullnessCost),
    energy: clampNeed(pet.energy - WALK.energyCost),
    happiness: clampNeed(pet.happiness + WALK.happiness),
    activity: 'awake',
    walkStartedAt: undefined,
  };
}

/**
 * Applies passive time-based changes and activity transitions up to `now`.
 * This is pure: callers pass the current state and the current time.
 */
export function advancePet(pet: Pet, now: number = Date.now()): Pet {
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const rawElapsed = safeNow - pet.lastUpdatedAt;

  if (rawElapsed <= 0) {
    return { ...pet, lastUpdatedAt: safeNow };
  }

  const elapsed = Math.min(rawElapsed, CATCH_UP_MAX_MS);
  const effectiveNow = pet.lastUpdatedAt + elapsed;

  if (pet.activity === 'sleeping') {
    const energyGap = NEED_MAX - pet.energy;
    if (energyGap <= 0) {
      const awake = applyAwakeDecay({ ...pet, activity: 'awake' }, elapsed);
      return { ...awake, lastUpdatedAt: safeNow };
    }

    const msToFull = (energyGap / SLEEP_ENERGY_PER_HOUR) * HOUR_MS;
    if (elapsed < msToFull) {
      return { ...applySleepDecay(pet, elapsed), lastUpdatedAt: safeNow };
    }

    const slept = applySleepDecay(pet, msToFull);
    const awake = applyAwakeDecay(
      { ...slept, activity: 'awake' },
      elapsed - msToFull,
    );
    return { ...awake, lastUpdatedAt: safeNow };
  }

  if (pet.activity === 'walking') {
    const walkEnd =
      pet.walkStartedAt !== undefined
        ? pet.walkStartedAt + pet.walkDurationMs
        : null;

    if (walkEnd === null) {
      const awake = applyAwakeDecay(
        { ...pet, activity: 'awake', walkStartedAt: undefined },
        elapsed,
      );
      return { ...awake, lastUpdatedAt: safeNow };
    }

    if (effectiveNow < walkEnd) {
      return { ...applyAwakeDecay(pet, elapsed), lastUpdatedAt: safeNow };
    }

    const beforeEnd = Math.max(0, walkEnd - pet.lastUpdatedAt);
    const atEnd = applyAwakeDecay(pet, beforeEnd);
    const completed = applyWalkEffects(atEnd);
    const afterEnd = Math.max(
      0,
      effectiveNow - Math.max(walkEnd, pet.lastUpdatedAt),
    );
    const final = afterEnd > 0 ? applyAwakeDecay(completed, afterEnd) : completed;
    return { ...final, lastUpdatedAt: safeNow };
  }

  return { ...applyAwakeDecay(pet, elapsed), lastUpdatedAt: safeNow };
}

export function deriveMood(pet: Pet): Mood {
  const needs = [pet.fullness, pet.energy, pet.happiness];

  if (needs.some((need) => need <= NEED_MIN)) {
    return 'critical';
  }
  if (needs.some((need) => need < MOOD_THRESHOLDS.low)) {
    return 'needy';
  }
  if (needs.every((need) => need >= MOOD_THRESHOLDS.medium)) {
    return 'happy';
  }
  return 'content';
}

export type NeedState = 'empty' | 'low' | 'okay' | 'good' | 'great';

export function needState(value: number): NeedState {
  if (value <= NEED_MIN) {
    return 'empty';
  }
  if (value < MOOD_THRESHOLDS.low) {
    return 'low';
  }
  if (value < MOOD_THRESHOLDS.medium) {
    return 'okay';
  }
  if (value < 90) {
    return 'good';
  }
  return 'great';
}

export function actionAvailability(
  pet: Pet,
  action: ActionType,
): Availability {
  const name = pet.name;

  switch (action) {
    case 'feed':
      if (pet.activity === 'sleeping') {
        return { available: false, reason: `${name} is asleep. Wake them first.` };
      }
      if (pet.activity === 'walking') {
        return { available: false, reason: `${name} is on a walk.` };
      }
      if (pet.fullness >= FEED.maxFullness) {
        return { available: false, reason: `${name} is already full.` };
      }
      return { available: true };

    case 'play':
      if (pet.activity === 'sleeping') {
        return { available: false, reason: `${name} is asleep. Wake them first.` };
      }
      if (pet.activity === 'walking') {
        return { available: false, reason: `${name} is on a walk.` };
      }
      if (pet.energy < PLAY.minEnergy) {
        return {
          available: false,
          reason: `${name} is too tired to play. Try a nap.`,
        };
      }
      return { available: true };

    case 'sleep':
      if (pet.activity === 'awake') {
        return { available: true };
      }
      if (pet.activity === 'sleeping') {
        return { available: false, reason: `${name} is already asleep.` };
      }
      return { available: false, reason: `${name} is on a walk.` };

    case 'wake':
      if (pet.activity === 'sleeping') {
        return { available: true };
      }
      if (pet.activity === 'awake') {
        return { available: false, reason: `${name} is already awake.` };
      }
      return { available: false, reason: `${name} is on a walk.` };

    case 'walk':
      if (pet.activity === 'sleeping') {
        return { available: false, reason: `${name} is asleep. Wake them first.` };
      }
      if (pet.activity === 'walking') {
        return { available: false, reason: `${name} is already on a walk.` };
      }
      if (pet.energy < WALK.minEnergy) {
        return {
          available: false,
          reason: `${name} needs more energy before a walk.`,
        };
      }
      return { available: true };

    case 'cancelWalk':
      if (pet.activity === 'walking') {
        return { available: true };
      }
      return { available: false, reason: `${name} is not on a walk.` };
  }
}

export function applyAction(
  pet: Pet,
  action: ActionType,
  now: number = Date.now(),
): ActionResult {
  const current = advancePet(pet, now);
  const availability = actionAvailability(current, action);

  if (!availability.available) {
    return {
      pet: current,
      changed: false,
      message: availability.reason ?? 'That action is not available right now.',
      kind: 'info',
    };
  }

  const safeNow = Number.isFinite(now) ? now : Date.now();
  const name = current.name;

  switch (action) {
    case 'feed': {
      const next: Pet = {
        ...current,
        fullness: clampNeed(current.fullness + FEED.fullness),
        happiness: clampNeed(current.happiness + FEED.happiness),
        lastUpdatedAt: safeNow,
      };
      return {
        pet: next,
        changed: true,
        message: `${name} enjoyed a snack!`,
        kind: 'success',
      };
    }

    case 'play': {
      const next: Pet = {
        ...current,
        happiness: clampNeed(current.happiness + PLAY.happiness),
        energy: clampNeed(current.energy - PLAY.energyCost),
        fullness: clampNeed(current.fullness - PLAY.fullnessCost),
        lastUpdatedAt: safeNow,
      };
      return {
        pet: next,
        changed: true,
        message: `${name} had fun playing!`,
        kind: 'success',
      };
    }

    case 'sleep': {
      const next: Pet = {
        ...current,
        activity: 'sleeping',
        lastUpdatedAt: safeNow,
      };
      return {
        pet: next,
        changed: true,
        message: `${name} is settling down for a nap.`,
        kind: 'success',
      };
    }

    case 'wake': {
      const next: Pet = {
        ...current,
        activity: 'awake',
        lastUpdatedAt: safeNow,
      };
      return {
        pet: next,
        changed: true,
        message: `${name} woke up.`,
        kind: 'success',
      };
    }

    case 'walk': {
      const next: Pet = {
        ...current,
        activity: 'walking',
        walkStartedAt: safeNow,
        lastUpdatedAt: safeNow,
      };
      return {
        pet: next,
        changed: true,
        message: `${name} is off on a walk!`,
        kind: 'success',
      };
    }

    case 'cancelWalk': {
      const next: Pet = {
        ...current,
        activity: 'awake',
        walkStartedAt: undefined,
        lastUpdatedAt: safeNow,
      };
      return {
        pet: next,
        changed: true,
        message: `Walk cancelled. ${name} is back.`,
        kind: 'info',
      };
    }
  }
}

export function remainingWalkMs(pet: Pet, now: number = Date.now()): number {
  if (pet.activity !== 'walking' || pet.walkStartedAt === undefined) {
    return 0;
  }
  return Math.max(0, pet.walkStartedAt + pet.walkDurationMs - now);
}

export function walkProgress(pet: Pet, now: number = Date.now()): number {
  if (pet.activity !== 'walking' || pet.walkStartedAt === undefined) {
    return 0;
  }
  const total = pet.walkDurationMs;
  if (total <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, (now - pet.walkStartedAt) / total));
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function isQuietHours(
  date: Date,
  preferences: Pick<
    Preferences,
    'quietHoursEnabled' | 'quietStart' | 'quietEnd'
  >,
): boolean {
  if (!preferences.quietHoursEnabled) {
    return false;
  }

  const start = parseTimeToMinutes(preferences.quietStart);
  const end = parseTimeToMinutes(preferences.quietEnd);
  if (start === null || end === null || start === end) {
    return false;
  }

  const now = date.getHours() * 60 + date.getMinutes();
  if (start < end) {
    return now >= start && now < end;
  }
  return now >= start || now < end;
}

export function formatWalkRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatMinutesOfDay(minutes: number): string {
  const normalized =
    ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
