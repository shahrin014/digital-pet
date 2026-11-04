import { describe, expect, it } from 'vitest';
import {
  actionAvailability,
  advancePet,
  applyAction,
  createPet,
  deriveMood,
  formatWalkRemaining,
  isQuietHours,
  needState,
  remainingWalkMs,
  validateName,
  walkProgress,
} from './engine';
import {
  HOUR_MS,
  INITIAL_NEED,
  NEED_MAX,
  WALK_DURATION_MS,
} from './constants';
import type { Pet } from './types';

const NOW = 1_700_000_000_000;

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    ...createPet('Mochi', 'fox', NOW),
    ...overrides,
  };
}

describe('createPet', () => {
  it('creates a healthy awake pet with initial needs', () => {
    const mochi = createPet('  Mochi  ', 'fox', NOW);

    expect(mochi.name).toBe('Mochi');
    expect(mochi.species).toBe('fox');
    expect(mochi.fullness).toBe(INITIAL_NEED);
    expect(mochi.energy).toBe(INITIAL_NEED);
    expect(mochi.happiness).toBe(INITIAL_NEED);
    expect(mochi.activity).toBe('awake');
    expect(mochi.createdAt).toBe(NOW);
    expect(mochi.lastUpdatedAt).toBe(NOW);
    expect(mochi.walkDurationMs).toBe(WALK_DURATION_MS);
    expect(mochi.id).toBeTruthy();
  });
});

describe('validateName', () => {
  it('accepts a valid name', () => {
    expect(validateName('Mochi')).toBeNull();
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateName('')).toBe('adoption.nameEmpty');
    expect(validateName('   ')).toBe('adoption.nameEmpty');
  });

  it('rejects names longer than 24 characters', () => {
    expect(validateName('a'.repeat(25))).toBe('adoption.nameTooLong');
  });

  it('accepts exactly 24 characters', () => {
    expect(validateName('a'.repeat(24))).toBeNull();
  });
});

describe('advancePet', () => {
  it('applies awake decay for elapsed time', () => {
    const advanced = advancePet(pet(), NOW + 2 * HOUR_MS);

    expect(advanced.fullness).toBeCloseTo(72, 4);
    expect(advanced.energy).toBeCloseTo(74, 4);
    expect(advanced.happiness).toBeCloseTo(76, 4);
    expect(advanced.lastUpdatedAt).toBe(NOW + 2 * HOUR_MS);
  });

  it('caps catch-up at 24 hours', () => {
    const threeDays = advancePet(pet(), NOW + 72 * HOUR_MS);
    const oneDay = advancePet(pet(), NOW + 24 * HOUR_MS);

    expect(threeDays.fullness).toBeCloseTo(oneDay.fullness, 4);
    expect(threeDays.energy).toBeCloseTo(oneDay.energy, 4);
    expect(threeDays.happiness).toBeCloseTo(oneDay.happiness, 4);
    expect(threeDays.lastUpdatedAt).toBe(NOW + 72 * HOUR_MS);
  });

  it('ignores negative elapsed time and corrects the timestamp', () => {
    const future = pet({ lastUpdatedAt: NOW + 60_000 });
    const advanced = advancePet(future, NOW);

    expect(advanced.fullness).toBe(future.fullness);
    expect(advanced.energy).toBe(future.energy);
    expect(advanced.happiness).toBe(future.happiness);
    expect(advanced.lastUpdatedAt).toBe(NOW);
  });

  it('regenerates energy while sleeping', () => {
    const sleeping = pet({ activity: 'sleeping', energy: 20 });
    const advanced = advancePet(sleeping, NOW + 4 * HOUR_MS);

    expect(advanced.energy).toBeCloseTo(60, 4);
    expect(advanced.fullness).toBeCloseTo(72, 4);
    expect(advanced.happiness).toBeCloseTo(76, 4);
    expect(advanced.activity).toBe('sleeping');
  });

  it('wakes automatically when sleep fills energy', () => {
    const sleeping = pet({ activity: 'sleeping', energy: 96 });
    const advanced = advancePet(sleeping, NOW + 0.4 * HOUR_MS);

    expect(advanced.energy).toBeCloseTo(100, 4);
    expect(advanced.activity).toBe('awake');
  });

  it('applies awake decay after an automatic wake', () => {
    const sleeping = pet({ activity: 'sleeping', energy: 20 });
    const advanced = advancePet(sleeping, NOW + 10 * HOUR_MS);

    expect(advanced.energy).toBeCloseTo(94, 4);
    expect(advanced.activity).toBe('awake');
  });

  it('completes a walk after the timer ends and keeps decaying afterwards', () => {
    const walking = pet({
      activity: 'walking',
      walkStartedAt: NOW,
      energy: 60,
      happiness: 40,
      fullness: 70,
    });
    const advanced = advancePet(walking, NOW + WALK_DURATION_MS);

    expect(advanced.activity).toBe('awake');
    expect(advanced.walkStartedAt).toBeUndefined();
    expect(advanced.happiness).toBeCloseTo(69.83, 2);
    expect(advanced.energy).toBeCloseTo(39.75, 2);
    expect(advanced.fullness).toBeCloseTo(59.67, 2);
  });

  it('applies walk effects before the remaining catch-up decay', () => {
    const walking = pet({
      activity: 'walking',
      walkStartedAt: NOW,
      energy: 80,
      happiness: 80,
      fullness: 80,
    });
    const advanced = advancePet(walking, NOW + 72 * HOUR_MS);

    expect(advanced.activity).toBe('awake');
    expect(advanced.fullness).toBeCloseTo(0, 4);
    expect(advanced.energy).toBeCloseTo(0, 4);
    expect(advanced.happiness).toBeCloseTo(52.17, 2);
  });

  it('keeps the pet walking before the timer ends', () => {
    const walking = pet({ activity: 'walking', walkStartedAt: NOW });
    const advanced = advancePet(walking, NOW + 60_000);

    expect(advanced.activity).toBe('walking');
    expect(advanced.walkStartedAt).toBe(NOW);
  });
});

describe('deriveMood', () => {
  it('returns happy when every need is at least 60', () => {
    expect(deriveMood(pet({ fullness: 80, energy: 80, happiness: 80 }))).toBe(
      'happy',
    );
  });

  it('returns needy when any need is below 30', () => {
    expect(deriveMood(pet({ fullness: 10, energy: 70, happiness: 70 }))).toBe(
      'needy',
    );
  });

  it('returns critical when any need is zero', () => {
    expect(deriveMood(pet({ fullness: 100, energy: 100, happiness: 0 }))).toBe(
      'critical',
    );
  });

  it('returns content when all needs are at least 30 but one is below 60', () => {
    expect(deriveMood(pet({ fullness: 30, energy: 70, happiness: 70 }))).toBe(
      'content',
    );
  });
});

describe('needState', () => {
  it('describes need levels with text', () => {
    expect(needState(0)).toBe('empty');
    expect(needState(15)).toBe('low');
    expect(needState(45)).toBe('okay');
    expect(needState(70)).toBe('good');
    expect(needState(95)).toBe('great');
  });
});

describe('actions', () => {
  it('feeds an awake pet', () => {
    const result = applyAction(
      pet({ fullness: 40, happiness: 50 }),
      'feed',
      NOW,
    );

    expect(result.changed).toBe(true);
    expect(result.pet.fullness).toBe(75);
    expect(result.pet.happiness).toBe(55);
  });

  it('blocks feeding an already full pet without changing needs', () => {
    const before = pet({ fullness: 96 });
    const result = applyAction(before, 'feed', NOW);

    expect(result.changed).toBe(false);
    expect(result.pet.fullness).toBe(96);
    expect(result.pet.energy).toBe(before.energy);
    expect(result.pet.happiness).toBe(before.happiness);
    expect(result.messageKey).toBe('action.feed.blocked.full');
  });

  it('blocks feeding a sleeping pet', () => {
    const result = applyAction(pet({ activity: 'sleeping' }), 'feed', NOW);

    expect(result.changed).toBe(false);
    expect(result.pet.activity).toBe('sleeping');
    expect(result.messageKey).toBe('action.feed.blocked.asleep');
  });

  it('plays with an energetic pet', () => {
    const result = applyAction(
      pet({ energy: 60, happiness: 40, fullness: 70 }),
      'play',
      NOW,
    );

    expect(result.changed).toBe(true);
    expect(result.pet.happiness).toBe(60);
    expect(result.pet.energy).toBe(50);
    expect(result.pet.fullness).toBe(65);
  });

  it('blocks play when the pet is too tired', () => {
    const result = applyAction(pet({ energy: 10 }), 'play', NOW);

    expect(result.changed).toBe(false);
    expect(result.pet.energy).toBe(10);
    expect(result.messageKey).toBe('action.play.blocked.tired');
  });

  it('puts the pet to sleep and wakes it again', () => {
    const sleeping = applyAction(pet(), 'sleep', NOW);
    expect(sleeping.pet.activity).toBe('sleeping');

    const awake = applyAction(sleeping.pet, 'wake', NOW);
    expect(awake.pet.activity).toBe('awake');
  });

  it('starts and cancels a walk', () => {
    const walking = applyAction(pet({ energy: 60 }), 'walk', NOW);
    expect(walking.pet.activity).toBe('walking');
    expect(walking.pet.walkStartedAt).toBe(NOW);

    const cancelled = applyAction(walking.pet, 'cancelWalk', NOW + 2 * 60_000);
    expect(cancelled.pet.activity).toBe('awake');
    expect(cancelled.pet.walkStartedAt).toBeUndefined();
    expect(cancelled.pet.happiness).toBeCloseTo(79.93, 2);
    expect(cancelled.pet.energy).toBeCloseTo(59.9, 2);
  });

  it('blocks walking when too tired', () => {
    const result = applyAction(pet({ energy: 20 }), 'walk', NOW);

    expect(result.changed).toBe(false);
    expect(result.pet.activity).toBe('awake');
    expect(result.messageKey).toBe('action.walk.blocked.tired');
  });

  it('blocks conflicting actions during a walk', () => {
    const walking = applyAction(pet({ energy: 60 }), 'walk', NOW).pet;

    for (const action of ['feed', 'play', 'sleep', 'wake', 'walk'] as const) {
      const result = applyAction(walking, action, NOW + 60_000);
      expect(result.changed).toBe(false);
      expect(result.pet.activity).toBe('walking');
    }
  });

  it('applies actions after a walk completes during catch-up', () => {
    const walking = applyAction(pet({ energy: 60 }), 'walk', NOW).pet;
    const result = applyAction(walking, 'feed', NOW + WALK_DURATION_MS + 60_000);

    expect(result.changed).toBe(true);
    expect(result.pet.activity).toBe('awake');
    expect(result.pet.fullness).toBeGreaterThan(80);
  });

  it('reports availability reasons', () => {
    expect(actionAvailability(pet({ energy: 10 }), 'play')).toEqual({
      available: false,
      reasonKey: 'action.play.blocked.tired',
      reasonParams: { name: 'Mochi' },
    });
    expect(actionAvailability(pet(), 'feed')).toEqual({ available: true });
  });
});

describe('walk timers', () => {
  it('reports remaining time and progress', () => {
    const walking = pet({ activity: 'walking', walkStartedAt: NOW });

    expect(remainingWalkMs(walking, NOW)).toBe(WALK_DURATION_MS);
    expect(walkProgress(walking, NOW)).toBe(0);
    expect(walkProgress(walking, NOW + WALK_DURATION_MS / 2)).toBe(0.5);
    expect(remainingWalkMs(walking, NOW + WALK_DURATION_MS)).toBe(0);
  });

  it('formats the remaining walk time', () => {
    expect(formatWalkRemaining(90_000)).toBe('1:30');
    expect(formatWalkRemaining(5_000)).toBe('0:05');
  });
});

describe('quiet hours', () => {
  const at = (hours: number, minutes = 0) =>
    new Date(2026, 0, 1, hours, minutes, 0, 0);

  it('supports an overnight quiet window', () => {
    const prefs = {
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '08:00',
    };

    expect(isQuietHours(at(23), prefs)).toBe(true);
    expect(isQuietHours(at(7, 59), prefs)).toBe(true);
    expect(isQuietHours(at(8), prefs)).toBe(false);
    expect(isQuietHours(at(12), prefs)).toBe(false);
  });

  it('supports a daytime quiet window', () => {
    const prefs = {
      quietHoursEnabled: true,
      quietStart: '09:00',
      quietEnd: '17:00',
    };

    expect(isQuietHours(at(12), prefs)).toBe(true);
    expect(isQuietHours(at(18), prefs)).toBe(false);
  });

  it('is disabled when requested or when times are invalid', () => {
    expect(
      isQuietHours(at(23), {
        quietHoursEnabled: false,
        quietStart: '22:00',
        quietEnd: '08:00',
      }),
    ).toBe(false);

    expect(
      isQuietHours(at(23), {
        quietHoursEnabled: true,
        quietStart: 'nope',
        quietEnd: '08:00',
      }),
    ).toBe(false);

    expect(
      isQuietHours(at(23), {
        quietHoursEnabled: true,
        quietStart: '22:00',
        quietEnd: '22:00',
      }),
    ).toBe(false);
  });
});

describe('need bounds', () => {
  it('never exceeds the maximum', () => {
    const result = applyAction(pet({ happiness: 95 }), 'feed', NOW);
    expect(result.pet.happiness).toBe(NEED_MAX);
  });
});
