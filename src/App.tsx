import { useCallback, useEffect, useRef, useState } from 'react';
import { AdoptionScreen } from './components/AdoptionScreen';
import { PetScreen } from './components/PetScreen';
import { SettingsDialog } from './components/SettingsDialog';
import {
  DEFAULT_PREFERENCES,
  REMINDER_INTERVAL_MS,
  REMINDER_THRESHOLD,
} from './game/constants';
import {
  advancePet,
  applyAction,
  createPet,
  deriveMood,
  isQuietHours,
  validateName,
} from './game/engine';
import type {
  ActionType,
  MessageKind,
  NeedKey,
  Pet,
  Preferences,
  Species,
} from './game/types';
import { repository } from './storage/repository';

type Screen = 'loading' | 'adoption' | 'game' | 'error';

interface ToastMessage {
  id: number;
  text: string;
  kind: MessageKind;
}

interface StartupError {
  title: string;
  message: string;
  canReset: boolean;
}

const NEED_KEYS: NeedKey[] = ['fullness', 'energy', 'happiness'];
const NEED_LABELS: Record<NeedKey, string> = {
  fullness: 'fullness',
  energy: 'energy',
  happiness: 'happiness',
};
const REMINDER_STORAGE_KEY = 'digital-pet.reminders.v1';

function emptyReminderTimes(): Record<NeedKey, number> {
  return { fullness: 0, energy: 0, happiness: 0 };
}

function loadReminderTimes(): Record<NeedKey, number> {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) {
      return emptyReminderTimes();
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return emptyReminderTimes();
    }
    const candidate = parsed as Record<string, unknown>;
    return {
      fullness:
        typeof candidate.fullness === 'number' &&
        Number.isFinite(candidate.fullness)
          ? candidate.fullness
          : 0,
      energy:
        typeof candidate.energy === 'number' &&
        Number.isFinite(candidate.energy)
          ? candidate.energy
          : 0,
      happiness:
        typeof candidate.happiness === 'number' &&
        Number.isFinite(candidate.happiness)
          ? candidate.happiness
          : 0,
    };
  } catch {
    return emptyReminderTimes();
  }
}

function saveReminderTimes(times: Record<NeedKey, number>): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(times));
  } catch {
    // Reminders still work for this session if localStorage is unavailable.
  }
}

function clearAppLocalStorage(): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('digital-pet.')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore unavailable storage.
  }
}

function listNeeds(needs: NeedKey[]): string {
  const labels = needs.map((need) => NEED_LABELS[need]);
  if (labels.length === 1) {
    return labels[0] ?? '';
  }
  const last = labels[labels.length - 1] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${last}`;
}

function reminderText(name: string, needs: NeedKey[]): string {
  const labels = listNeeds(needs);
  const suggestions: string[] = [];
  if (needs.includes('fullness')) {
    suggestions.push('A snack would help.');
  }
  if (needs.includes('energy')) {
    suggestions.push('A nap would help.');
  }
  if (needs.includes('happiness')) {
    suggestions.push('Some playtime would help.');
  }
  return `${name} could use some care: ${labels} ${
    needs.length === 1 ? 'is' : 'are'
  } low. ${suggestions.join(' ')}`;
}

function recommendedAction(needs: NeedKey[], pet: Pet): ActionType {
  if (needs.includes('fullness')) {
    return 'feed';
  }
  if (needs.includes('energy')) {
    return pet.activity === 'sleeping' ? 'wake' : 'sleep';
  }
  return 'play';
}

function describeStorageError(error: unknown): string {
  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'QuotaExceededError'
  ) {
    return 'Storage is full. Your latest progress may not be saved.';
  }
  if (error instanceof Error && error.message) {
    return `Progress may not be saved: ${error.message}`;
  }
  return 'Progress may not be saved. Your browser storage may be unavailable.';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [pet, setPet] = useState<Pet | null>(null);
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<StartupError | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlightAction, setHighlightAction] = useState<ActionType | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);

  const mountedRef = useRef(true);
  const petRef = useRef<Pet | null>(null);
  const preferencesRef = useRef<Preferences>(DEFAULT_PREFERENCES);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const preferencesChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastSaveAttemptRef = useRef(0);
  const lastActionRef = useRef<Record<string, number>>({});
  const remindersRef = useRef<Record<NeedKey, number>>(emptyReminderTimes());
  const toastIdRef = useRef(0);
  const resettingRef = useRef(false);

  const nextToastId = useCallback(() => {
    toastIdRef.current += 1;
    return toastIdRef.current;
  }, []);

  const showToast = useCallback(
    (text: string, kind: MessageKind = 'info') => {
      setToast({ id: nextToastId(), text, kind });
    },
    [nextToastId],
  );

  const updatePet = useCallback((next: Pet) => {
    petRef.current = next;
    setPet(next);
  }, []);

  const enqueuePetSave = useCallback((next: Pet): Promise<void> => {
    const run = saveChainRef.current
      .catch(() => undefined)
      .then(() => repository.savePet(next))
      .then(
        () => undefined,
        (error: unknown) => {
          if (mountedRef.current) {
            setStorageWarning(describeStorageError(error));
          }
        },
      );
    saveChainRef.current = run;
    return run;
  }, []);

  const enqueuePreferencesSave = useCallback(
    (next: Preferences): Promise<void> => {
      const run = preferencesChainRef.current
        .catch(() => undefined)
        .then(() => repository.savePreferences(next))
        .then(
          () => undefined,
          (error: unknown) => {
            if (mountedRef.current) {
              setStorageWarning(describeStorageError(error));
            }
          },
        );
      preferencesChainRef.current = run;
      return run;
    },
    [],
  );

  const savePetNow = useCallback(
    (next: Pet) => {
      lastSaveAttemptRef.current = Date.now();
      void enqueuePetSave(next);
    },
    [enqueuePetSave],
  );

  const maybeNotify = useCallback(
    (current: Pet) => {
      const prefs = preferencesRef.current;
      const now = Date.now();

      if (isQuietHours(new Date(now), prefs)) {
        return;
      }

      const due = NEED_KEYS.filter(
        (need) =>
          current[need] < REMINDER_THRESHOLD &&
          now - (remindersRef.current[need] ?? 0) >= REMINDER_INTERVAL_MS,
      );
      if (due.length === 0) {
        return;
      }

      const text = reminderText(current.name, due);
      const visible = document.visibilityState === 'visible';
      const canUseBrowserNotifications =
        prefs.browserNotifications &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted';

      if (!visible && !canUseBrowserNotifications) {
        return;
      }

      let shown = false;
      if (visible) {
        showToast(text, 'info');
        shown = true;
      } else {
        try {
          const notification = new Notification(`${current.name} needs you`, {
            body: text,
            icon: new URL('icons/icon-192.png', document.baseURI).href,
            tag: 'digital-pet-reminder',
          });
          notification.onclick = () => {
            window.focus();
            setHighlightAction(recommendedAction(due, current));
            notification.close();
          };
          shown = true;
        } catch {
          shown = false;
        }
      }

      if (shown) {
        for (const need of due) {
          remindersRef.current[need] = now;
        }
        saveReminderTimes(remindersRef.current);
      }
    },
    [showToast],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [petResult, loadedPreferences] = await Promise.all([
          repository.loadPet(),
          repository.loadPreferences(),
        ]);

        if (cancelled || !mountedRef.current) {
          return;
        }

        preferencesRef.current = loadedPreferences;
        setPreferences(loadedPreferences);

        if (petResult.status === 'empty') {
          setScreen('adoption');
          return;
        }

        if (petResult.status === 'corrupt') {
          setStartupError({
            title: 'Saved data could not be read',
            message:
              'The saved pet data looks damaged. You can reset it and adopt a new pet.',
            canReset: true,
          });
          setScreen('error');
          return;
        }

        const advanced = advancePet(petResult.value, Date.now());
        petRef.current = advanced;
        setPet(advanced);
        setScreen('game');
        lastSaveAttemptRef.current = Date.now();
        void enqueuePetSave(advanced);

        if (deriveMood(advanced) === 'critical') {
          showToast(
            `${advanced.name} is glad you're here. A little care will help.`,
            'info',
          );
        }
      } catch (error) {
        if (cancelled || !mountedRef.current) {
          return;
        }
        setStartupError({
          title: 'Storage unavailable',
          message: describeStorageError(error),
          canReset: false,
        });
        setScreen('error');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enqueuePetSave, reloadKey, showToast]);

  useEffect(() => {
    if (screen !== 'game') {
      return;
    }

    const tick = () => {
      if (resettingRef.current) {
        return;
      }
      const current = petRef.current;
      if (!current) {
        return;
      }

      const next = advancePet(current, Date.now());
      const activityChanged = next.activity !== current.activity;
      const walkChanged = next.walkStartedAt !== current.walkStartedAt;

      updatePet(next);
      maybeNotify(next);

      const now = Date.now();
      if (
        activityChanged ||
        walkChanged ||
        now - lastSaveAttemptRef.current >= 10_000
      ) {
        savePetNow(next);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const current = petRef.current;
        if (current) {
          const next = advancePet(current, Date.now());
          updatePet(next);
          savePetNow(next);
        }
      } else {
        tick();
      }
    };

    const onPageHide = () => {
      const current = petRef.current;
      if (current) {
        const next = advancePet(current, Date.now());
        updatePet(next);
        savePetNow(next);
      }
    };

    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [enqueuePetSave, maybeNotify, savePetNow, screen, updatePet]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(
      () => setToast(null),
      toast.kind === 'error' ? 8000 : 5000,
    );
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!highlightAction) {
      return;
    }
    const timeout = window.setTimeout(() => setHighlightAction(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [highlightAction]);

  useEffect(() => {
    if (screen === 'game' && pet) {
      document.title = `${pet.name} · Digital Pet`;
    } else if (screen === 'adoption') {
      document.title = 'Adopt a pet · Digital Pet';
    } else {
      document.title = 'Digital Pet';
    }
  }, [pet, screen]);

  useEffect(() => {
    remindersRef.current = loadReminderTimes();
  }, []);

  const handleAction = useCallback(
    async (action: ActionType) => {
      if (resettingRef.current) {
        return;
      }
      const current = petRef.current;
      if (!current) {
        return;
      }

      const now = Date.now();
      const throttleKey =
        action === 'wake'
          ? 'sleep'
          : action === 'cancelWalk'
            ? 'walk'
            : action;
      if (now - (lastActionRef.current[throttleKey] ?? 0) < 1000) {
        return;
      }
      lastActionRef.current[throttleKey] = now;

      const result = applyAction(current, action, now);
      const activityChanged =
        result.pet.activity !== current.activity ||
        result.pet.walkStartedAt !== current.walkStartedAt;

      updatePet(result.pet);
      setHighlightAction(null);
      showToast(result.message, result.kind);

      if (result.changed || activityChanged) {
        lastSaveAttemptRef.current = now;
        await enqueuePetSave(result.pet);
      }
    },
    [enqueuePetSave, showToast, updatePet],
  );

  const handleAdopt = useCallback(
    async (name: string, species: Species) => {
      const validationError = validateName(name);
      if (validationError) {
        throw new Error(validationError);
      }

      const newPet = createPet(name, species, Date.now());
      try {
        await repository.savePet(newPet);
      } catch {
        throw new Error(
          'Your pet could not be saved. Your browser storage may be unavailable or full. Please try again.',
        );
      }

      if (!mountedRef.current) {
        return;
      }

      petRef.current = newPet;
      setPet(newPet);
      setScreen('game');
      lastSaveAttemptRef.current = Date.now();
      setToast({
        id: nextToastId(),
        text: `Welcome, ${newPet.name}!`,
        kind: 'success',
      });
    },
    [nextToastId],
  );

  const handleSavePreferences = useCallback(
    (next: Preferences) => {
      preferencesRef.current = next;
      setPreferences(next);
      void enqueuePreferencesSave(next);
    },
    [enqueuePreferencesSave],
  );

  const handleReset = useCallback(async () => {
    resettingRef.current = true;
    try {
      await saveChainRef.current.catch(() => undefined);
      await preferencesChainRef.current.catch(() => undefined);
      await repository.deletePet();
      clearAppLocalStorage();
      lastActionRef.current = {};
      remindersRef.current = emptyReminderTimes();

      if (!mountedRef.current) {
        return;
      }

      petRef.current = null;
      setPet(null);
      setStartupError(null);
      setStorageWarning(null);
      setSettingsOpen(false);
      setHighlightAction(null);
      setScreen('adoption');
      setToast({
        id: nextToastId(),
        text: 'Your pet has been reset. You can adopt a new friend.',
        kind: 'info',
      });
    } catch (error) {
      if (mountedRef.current) {
        setStorageWarning(describeStorageError(error));
      }
    } finally {
      resettingRef.current = false;
    }
  }, [nextToastId]);

  const handleDeleteDatabase = useCallback(async () => {
    resettingRef.current = true;
    try {
      await saveChainRef.current.catch(() => undefined);
      await preferencesChainRef.current.catch(() => undefined);
      await repository.deleteDatabase();
      clearAppLocalStorage();
      lastActionRef.current = {};
      remindersRef.current = emptyReminderTimes();

      if (!mountedRef.current) {
        return;
      }

      petRef.current = null;
      setPet(null);
      preferencesRef.current = DEFAULT_PREFERENCES;
      setPreferences(DEFAULT_PREFERENCES);
      setStartupError(null);
      setStorageWarning(null);
      setSettingsOpen(false);
      setHighlightAction(null);
      setScreen('adoption');
      setToast({
        id: nextToastId(),
        text: 'All local data has been deleted.',
        kind: 'info',
      });
    } finally {
      resettingRef.current = false;
    }
  }, [nextToastId]);

  const handleRetry = useCallback(() => {
    setStartupError(null);
    setScreen('loading');
    setReloadKey((key) => key + 1);
  }, []);

  const feedbackBars = (
    <>
      {storageWarning && (
        <div className="storage-warning" role="alert">
          <span>{storageWarning}</span>
          <button
            type="button"
            className="message-dismiss"
            onClick={() => setStorageWarning(null)}
            aria-label="Dismiss storage warning"
          >
            ✕
          </button>
        </div>
      )}

      {toast && (
        <div
          className={`message message--${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            className="message-dismiss"
            onClick={() => setToast(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );

  if (screen === 'loading') {
    return (
      <main className="app-shell">
        <div className="loading-screen" role="status" aria-live="polite">
          <div className="loading-dot" aria-hidden="true" />
          <p>Waking up your pet…</p>
        </div>
      </main>
    );
  }

  if (screen === 'error' && startupError) {
    return (
      <main className="app-shell">
        <div className="error-screen">
          <h1>{startupError.title}</h1>
          <p>{startupError.message}</p>
          <div className="error-actions">
            <button type="button" className="primary-button" onClick={handleRetry}>
              Try again
            </button>
            {startupError.canReset && (
              <button type="button" className="danger-button" onClick={handleReset}>
                Reset saved data
              </button>
            )}
          </div>
          {startupError.canReset && (
            <p className="error-hint">
              Resetting deletes the saved pet and all progress from this device.
            </p>
          )}
        </div>
      </main>
    );
  }

  if (screen === 'adoption') {
    return (
      <main className="app-shell">
        {feedbackBars}
        <AdoptionScreen onAdopt={handleAdopt} />
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="app-shell">
        <div className="error-screen">
          <h1>Something went wrong</h1>
          <p>Your pet could not be loaded.</p>
          <button type="button" className="primary-button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {feedbackBars}

      <PetScreen
        pet={pet}
        onAction={handleAction}
        onOpenSettings={() => setSettingsOpen(true)}
        highlightAction={highlightAction}
      />

      <SettingsDialog
        open={settingsOpen}
        preferences={preferences}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSavePreferences}
        onReset={handleReset}
        onDeleteDatabase={handleDeleteDatabase}
      />
    </main>
  );
}
