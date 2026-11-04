import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_PREFERENCES } from '../game/constants';
import { ACTIVITIES, SPECIES } from '../game/types';
import type { Pet, Preferences } from '../game/types';

const DB_VERSION = 1;
const STORE_NAME = 'state';
const PET_KEY = 'pet';
const PREFERENCES_KEY = 'preferences';

interface DigitalPetDB extends DBSchema {
  state: {
    key: string;
    value: unknown;
  };
}

export type LoadResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'empty' }
  | { status: 'corrupt' };

export interface Repository {
  loadPet(): Promise<LoadResult<Pet>>;
  savePet(pet: Pet): Promise<void>;
  deletePet(): Promise<void>;
  loadPreferences(): Promise<Preferences>;
  savePreferences(preferences: Preferences): Promise<void>;
  clearAll(): Promise<void>;
  close(): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNeed(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isSpecies(value: unknown): value is Pet['species'] {
  return (
    typeof value === 'string' &&
    (SPECIES as readonly string[]).includes(value)
  );
}

function isActivity(value: unknown): value is Pet['activity'] {
  return (
    typeof value === 'string' &&
    (ACTIVITIES as readonly string[]).includes(value)
  );
}

export function isPet(value: unknown): value is Pet {
  if (!isRecord(value)) {
    return false;
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    name.length > 0 &&
    name.length <= 24 &&
    isSpecies(value.species) &&
    isFiniteNumber(value.createdAt) &&
    isNeed(value.fullness) &&
    isNeed(value.energy) &&
    isNeed(value.happiness) &&
    isActivity(value.activity) &&
    isFiniteNumber(value.lastUpdatedAt) &&
    (value.walkStartedAt === undefined ||
      isFiniteNumber(value.walkStartedAt)) &&
    isFiniteNumber(value.walkDurationMs) &&
    value.walkDurationMs > 0
  );
}

function isTimeString(value: unknown): value is string {
  return (
    typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
  );
}

export function isPreferences(value: unknown): value is Preferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.browserNotifications === 'boolean' &&
    typeof value.quietHoursEnabled === 'boolean' &&
    isTimeString(value.quietStart) &&
    isTimeString(value.quietEnd)
  );
}

export function createRepository(dbName = 'digital-pet'): Repository {
  let dbPromise: Promise<IDBPDatabase<DigitalPetDB>> | null = null;

  function getDb(): Promise<IDBPDatabase<DigitalPetDB>> {
    if (!dbPromise) {
      dbPromise = openDB<DigitalPetDB>(dbName, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      }).catch((error: unknown) => {
        dbPromise = null;
        throw error;
      });
    }
    return dbPromise;
  }

  return {
    async loadPet() {
      const db = await getDb();
      const value = await db.get(STORE_NAME, PET_KEY);

      if (value === undefined) {
        return { status: 'empty' };
      }
      if (isPet(value)) {
        return { status: 'ok', value };
      }
      return { status: 'corrupt' };
    },

    async savePet(pet) {
      const db = await getDb();
      await db.put(STORE_NAME, pet, PET_KEY);
    },

    async deletePet() {
      const db = await getDb();
      await db.delete(STORE_NAME, PET_KEY);
    },

    async loadPreferences() {
      const db = await getDb();
      const value = await db.get(STORE_NAME, PREFERENCES_KEY);

      if (value === undefined) {
        return { ...DEFAULT_PREFERENCES };
      }
      if (isPreferences(value)) {
        return { ...value };
      }
      return { ...DEFAULT_PREFERENCES };
    },

    async savePreferences(preferences) {
      const db = await getDb();
      await db.put(STORE_NAME, preferences, PREFERENCES_KEY);
    },

    async clearAll() {
      const db = await getDb();
      await db.clear(STORE_NAME);
    },

    async close() {
      if (dbPromise) {
        const db = await dbPromise;
        db.close();
        dbPromise = null;
      }
    },
  };
}

export const repository = createRepository();

export async function deleteDatabase(dbName = 'digital-pet'): Promise<void> {
  await deleteDB(dbName);
}
