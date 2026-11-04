import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_PREFERENCES } from '../game/constants';
import { ACTIVITIES, SPECIES } from '../game/types';
import type { Pet, Preferences } from '../game/types';
import type { StoredAnimationPack } from '../animation/types';

const DB_VERSION = 2;
const STORE_NAME = 'state';
const ANIMATION_PACKS_STORE = 'animationPacks';
const PET_KEY = 'pet';
const PREFERENCES_KEY = 'preferences';

interface DigitalPetDB extends DBSchema {
  state: {
    key: string;
    value: unknown;
  };
  animationPacks: {
    key: string;
    value: StoredAnimationPack;
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
  loadAnimationPack(petId: string): Promise<StoredAnimationPack | null>;
  saveAnimationPack(petId: string, pack: StoredAnimationPack): Promise<void>;
  deleteAnimationPack(petId: string): Promise<void>;
  clearAll(): Promise<void>;
  deleteDatabase(): Promise<void>;
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

function isMotionPreference(value: unknown): value is Preferences['motion'] {
  return value === 'system' || value === 'full' || value === 'reduced';
}

export function normalizePreferences(value: unknown): Preferences {
  if (!isRecord(value)) {
    return { ...DEFAULT_PREFERENCES };
  }

  return {
    browserNotifications:
      typeof value.browserNotifications === 'boolean'
        ? value.browserNotifications
        : DEFAULT_PREFERENCES.browserNotifications,
    quietHoursEnabled:
      typeof value.quietHoursEnabled === 'boolean'
        ? value.quietHoursEnabled
        : DEFAULT_PREFERENCES.quietHoursEnabled,
    quietStart: isTimeString(value.quietStart)
      ? value.quietStart
      : DEFAULT_PREFERENCES.quietStart,
    quietEnd: isTimeString(value.quietEnd)
      ? value.quietEnd
      : DEFAULT_PREFERENCES.quietEnd,
    motion: isMotionPreference(value.motion)
      ? value.motion
      : DEFAULT_PREFERENCES.motion,
  };
}

export function isPreferences(value: unknown): value is Preferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.browserNotifications === 'boolean' &&
    typeof value.quietHoursEnabled === 'boolean' &&
    isTimeString(value.quietStart) &&
    isTimeString(value.quietEnd) &&
    isMotionPreference(value.motion)
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
          if (!db.objectStoreNames.contains(ANIMATION_PACKS_STORE)) {
            db.createObjectStore(ANIMATION_PACKS_STORE);
          }
        },
      }).catch((error: unknown) => {
        dbPromise = null;
        throw error;
      });
    }
    return dbPromise;
  }

  async function closeDb(): Promise<void> {
    if (dbPromise) {
      const db = await dbPromise.catch(() => null);
      db?.close();
      dbPromise = null;
    }
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
      return normalizePreferences(value);
    },

    async savePreferences(preferences) {
      const db = await getDb();
      await db.put(STORE_NAME, preferences, PREFERENCES_KEY);
    },

    async loadAnimationPack(petId) {
      const db = await getDb();
      return (await db.get(ANIMATION_PACKS_STORE, petId)) ?? null;
    },

    async saveAnimationPack(petId, pack) {
      const db = await getDb();
      await db.put(ANIMATION_PACKS_STORE, pack, petId);
    },

    async deleteAnimationPack(petId) {
      const db = await getDb();
      await db.delete(ANIMATION_PACKS_STORE, petId);
    },

    async clearAll() {
      const db = await getDb();
      await db.clear(STORE_NAME);
      await db.clear(ANIMATION_PACKS_STORE);
    },

    async deleteDatabase() {
      await closeDb();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(
              'The local database is still in use in another tab. Close other Digital Pet tabs and try again.',
            ),
          );
        }, 5000);

        deleteDB(dbName).then(
          () => {
            clearTimeout(timer);
            resolve();
          },
          (error: unknown) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      });
    },

    close: closeDb,
  };
}

export const repository = createRepository();

export async function deleteDatabase(dbName = 'digital-pet'): Promise<void> {
  await deleteDB(dbName);
}
