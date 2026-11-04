import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../game/constants';
import { createPet } from '../game/engine';
import {
  createRepository,
  isPet,
  isPreferences,
  type Repository,
} from './repository';

let dbName: string;
let repo: Repository;
let counter = 0;

beforeEach(() => {
  dbName = `digital-pet-test-${counter++}`;
  repo = createRepository(dbName);
});

afterEach(async () => {
  await repo.close();
  await deleteDB(dbName);
});

describe('repository', () => {
  it('returns empty when no pet is saved', async () => {
    await expect(repo.loadPet()).resolves.toEqual({ status: 'empty' });
  });

  it('saves and loads a pet', async () => {
    const mochi = createPet('Mochi', 'fox', 1_700_000_000_000);

    await repo.savePet(mochi);

    await expect(repo.loadPet()).resolves.toEqual({
      status: 'ok',
      value: mochi,
    });
  });

  it('persists a pet across repository instances', async () => {
    const mochi = createPet('Mochi', 'cat', 1_700_000_000_000);
    await repo.savePet(mochi);
    await repo.close();

    const reopened = createRepository(dbName);
    const loaded = await reopened.loadPet();
    await reopened.close();

    expect(loaded).toEqual({ status: 'ok', value: mochi });
  });

  it('deletes a saved pet', async () => {
    await repo.savePet(createPet('Mochi', 'bunny', 1_700_000_000_000));
    await repo.deletePet();

    await expect(repo.loadPet()).resolves.toEqual({ status: 'empty' });
  });

  it('reports corrupt saved data instead of throwing', async () => {
    await repo.loadPet();
    const db = await openDB(dbName, 1);
    await db.put('state', { nope: true }, 'pet');
    db.close();

    await expect(repo.loadPet()).resolves.toEqual({ status: 'corrupt' });
  });

  it('loads default preferences when none are saved', async () => {
    await expect(repo.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });

  it('saves and loads preferences', async () => {
    const preferences = {
      browserNotifications: true,
      quietHoursEnabled: false,
      quietStart: '21:30',
      quietEnd: '07:15',
    };

    await repo.savePreferences(preferences);

    await expect(repo.loadPreferences()).resolves.toEqual(preferences);
  });

  it('falls back to default preferences when saved data is corrupt', async () => {
    await repo.loadPreferences();
    const db = await openDB(dbName, 1);
    await db.put('state', { quietStart: 'not-a-time' }, 'preferences');
    db.close();

    await expect(repo.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });

  it('clears all saved data', async () => {
    await repo.savePet(createPet('Mochi', 'fox', 1_700_000_000_000));
    await repo.savePreferences({
      ...DEFAULT_PREFERENCES,
      browserNotifications: true,
    });

    await repo.clearAll();

    await expect(repo.loadPet()).resolves.toEqual({ status: 'empty' });
    await expect(repo.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });
});

describe('validators', () => {
  it('accepts a valid pet', () => {
    expect(isPet(createPet('Mochi', 'fox', 1_700_000_000_000))).toBe(true);
  });

  it('rejects malformed pets', () => {
    expect(isPet(null)).toBe(false);
    expect(isPet({})).toBe(false);
    expect(
      isPet({
        ...createPet('Mochi', 'fox', 1_700_000_000_000),
        fullness: 200,
      }),
    ).toBe(false);
    expect(
      isPet({
        ...createPet('Mochi', 'fox', 1_700_000_000_000),
        activity: 'flying',
      }),
    ).toBe(false);
  });

  it('accepts valid preferences and rejects invalid ones', () => {
    expect(isPreferences(DEFAULT_PREFERENCES)).toBe(true);
    expect(
      isPreferences({ ...DEFAULT_PREFERENCES, quietStart: '25:00' }),
    ).toBe(false);
    expect(isPreferences({ browserNotifications: 'yes' })).toBe(false);
  });
});
