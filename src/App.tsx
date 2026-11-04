import { useCallback, useEffect, useRef, useState } from 'react';
import { AdoptionScreen } from './components/AdoptionScreen';
import { AnimationPackDialog } from './components/AnimationPackDialog';
import { InstallBanner } from './components/InstallBanner';
import { PetScreen } from './components/PetScreen';
import { SettingsDialog } from './components/SettingsDialog';
import { renderAnimationPack } from './animation/render';
import {
  persistentAnimationFor,
  timingForState,
  type AnimationState,
  type ParsedAnimationPack,
  type RenderedAnimationPack,
  type StoredAnimationPack,
  type TransientAnimationState,
} from './animation/types';
import { usePrefersReducedMotion } from './animation/usePrefersReducedMotion';
import {
  dismissInstallBanner,
  wasInstallBannerDismissed,
} from './pwa/install';
import { useInstallPrompt } from './pwa/useInstallPrompt';
import {
  DEFAULT_PREFERENCES,
  NAME_MAX_LENGTH,
  REMINDER_INTERVAL_MS,
  REMINDER_THRESHOLD,
} from './game/constants';
import {
  formatList,
  getLocale,
  setLocale,
  t,
  useTranslation,
  type Locale,
  type MessageKey,
} from './i18n';
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
const NEED_LABEL_KEYS: Record<NeedKey, MessageKey> = {
  fullness: 'need.fullness',
  energy: 'need.energy',
  happiness: 'need.happiness',
};
const SUGGESTION_KEYS: Record<NeedKey, MessageKey> = {
  fullness: 'reminder.suggestion.fullness',
  energy: 'reminder.suggestion.energy',
  happiness: 'reminder.suggestion.happiness',
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
  return formatList(needs.map((need) => t(NEED_LABEL_KEYS[need])));
}

function reminderText(name: string, needs: NeedKey[]): string {
  const labels = listNeeds(needs);
  const suggestions = needs
    .map((need) => t(SUGGESTION_KEYS[need]))
    .join(getLocale() === 'ja' ? '' : ' ');
  return t('reminder.text', {
    name,
    needs: labels,
    suggestions,
    verb: needs.length === 1 ? 'is' : 'are',
  });
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
    return t('app.storage.quota');
  }
  return t('app.storage.unavailable');
}

export default function App() {
  const { locale, t } = useTranslation();
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
  const [transientAnimation, setTransientAnimation] =
    useState<AnimationState | null>(null);
  const [storedAnimationPack, setStoredAnimationPack] =
    useState<StoredAnimationPack | null>(null);
  const [renderedAnimationPack, setRenderedAnimationPack] =
    useState<RenderedAnimationPack | null>(null);
  const [animationPackError, setAnimationPackError] = useState(false);
  const [animationDialogOpen, setAnimationDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [installDismissed, setInstallDismissed] = useState(() =>
    wasInstallBannerDismissed(),
  );
  const install = useInstallPrompt();
  const systemReducedMotion = usePrefersReducedMotion();
  const reducedMotion =
    preferences.motion === 'full'
      ? false
      : preferences.motion === 'reduced'
        ? true
        : systemReducedMotion;

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
  const transientTimerRef = useRef<number | null>(null);
  const renderedPackRef = useRef<RenderedAnimationPack | null>(null);

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

  const handleInstall = useCallback(async () => {
    const outcome = await install.promptInstall();
    if (outcome !== 'unavailable') {
      setInstallDismissed(true);
      dismissInstallBanner();
    }
  }, [install.promptInstall]);

  const handleDismissInstall = useCallback(() => {
    setInstallDismissed(true);
    dismissInstallBanner();
  }, []);

  const clearTransient = useCallback(() => {
    setTransientAnimation(null);
    if (transientTimerRef.current !== null) {
      window.clearTimeout(transientTimerRef.current);
      transientTimerRef.current = null;
    }
  }, []);

  const triggerTransient = useCallback(
    (animation: TransientAnimationState) => {
      clearTransient();
      setTransientAnimation(animation);
      const duration = timingForState(
        animation,
        renderedPackRef.current?.manifest,
      ).totalMs;
      transientTimerRef.current = window.setTimeout(() => {
        setTransientAnimation(null);
        transientTimerRef.current = null;
      }, duration);
    },
    [clearTransient],
  );

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
          const notification = new Notification(
            t('reminder.title', { name: current.name }),
            {
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

  useEffect(
    () => () => {
      if (transientTimerRef.current !== null) {
        window.clearTimeout(transientTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStoredAnimationPack(null);
      setRenderedAnimationPack(null);
      renderedPackRef.current = null;
      setAnimationPackError(false);

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
        setLocale(loadedPreferences.locale);

        if (petResult.status === 'empty') {
          setScreen('adoption');
          return;
        }

        if (petResult.status === 'corrupt') {
          setStartupError({
            title: t('app.startup.corrupt.title'),
            message:
              t('app.startup.corrupt.message'),
            canReset: true,
          });
          setScreen('error');
          return;
        }

        const advanced = advancePet(petResult.value, Date.now());
        petRef.current = advanced;
        setPet(advanced);
        setScreen('game');
        clearTransient();
        lastSaveAttemptRef.current = Date.now();
        void enqueuePetSave(advanced);

        if (deriveMood(advanced) === 'critical') {
          showToast(
            t('app.critical', { name: advanced.name }),
            'info',
          );
        }

        void (async () => {
          try {
            const storedPack = await repository.loadAnimationPack(advanced.id);
            if (cancelled || !mountedRef.current) {
              return;
            }
            if (!storedPack) {
              return;
            }

            setStoredAnimationPack(storedPack);
            try {
              const rendered = await renderAnimationPack(storedPack);
              if (cancelled || !mountedRef.current) {
                return;
              }
              setRenderedAnimationPack(rendered);
              renderedPackRef.current = rendered;
            } catch {
              if (cancelled || !mountedRef.current) {
                return;
              }
              setAnimationPackError(true);
              setStorageWarning(
                t('app.storage.customAnimation'),
              );
            }
          } catch {
            if (cancelled || !mountedRef.current) {
              return;
            }
            setStorageWarning(
              t('app.storage.customAnimation'),
            );
          }
        })();
      } catch (error) {
        if (cancelled || !mountedRef.current) {
          return;
        }
        setStartupError({
          title: t('app.startup.storage.title'),
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
  }, [clearTransient, enqueuePetSave, reloadKey, showToast]);

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
        clearTransient();
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
      clearTransient();
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
  }, [
    clearTransient,
    enqueuePetSave,
    maybeNotify,
    savePetNow,
    screen,
    updatePet,
  ]);

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
      document.title = t('app.title.pet', { name: pet.name });
    } else if (screen === 'adoption') {
      document.title = t('app.title.adopt');
    } else {
      document.title = t('app.title.default');
    }
  }, [locale, pet, screen, t]);

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
      showToast(t(result.messageKey, result.messageParams), result.kind);

      if (result.changed) {
        switch (action) {
          case 'feed':
            triggerTransient('feed');
            break;
          case 'play':
            triggerTransient('play');
            break;
          case 'wake':
            triggerTransient('wake');
            break;
          case 'sleep':
          case 'walk':
          case 'cancelWalk':
            clearTransient();
            break;
        }
      }

      if (result.changed || activityChanged) {
        lastSaveAttemptRef.current = now;
        await enqueuePetSave(result.pet);
      }
    },
    [
      clearTransient,
      enqueuePetSave,
      showToast,
      triggerTransient,
      updatePet,
    ],
  );

  const handleAdopt = useCallback(
    async (name: string, species: Species) => {
      const validationError = validateName(name);
      if (validationError) {
        throw new Error(t(validationError, { max: NAME_MAX_LENGTH }));
      }

      const newPet = createPet(name, species, Date.now());
      try {
        await repository.savePet(newPet);
      } catch {
        throw new Error(
          t('adoption.error'),
        );
      }

      if (!mountedRef.current) {
        return;
      }

      petRef.current = newPet;
      setPet(newPet);
      setScreen('game');
      clearTransient();
      setStoredAnimationPack(null);
      setRenderedAnimationPack(null);
      renderedPackRef.current = null;
      setAnimationPackError(false);
      setAnimationDialogOpen(false);
      lastSaveAttemptRef.current = Date.now();
      setToast({
        id: nextToastId(),
        text: t('app.welcome', { name: newPet.name }),
        kind: 'success',
      });
    },
    [clearTransient, nextToastId],
  );

  const handleSavePreferences = useCallback(
    (next: Preferences) => {
      preferencesRef.current = next;
      setPreferences(next);
      setLocale(next.locale);
      void enqueuePreferencesSave(next);
    },
    [enqueuePreferencesSave],
  );

  const handleLocaleChange = useCallback(
    (nextLocale: Locale) => {
      const next = { ...preferencesRef.current, locale: nextLocale };
      preferencesRef.current = next;
      setPreferences(next);
      setLocale(nextLocale);
      void enqueuePreferencesSave(next);
    },
    [enqueuePreferencesSave],
  );

  const handleApplyAnimationPack = useCallback(
    async (pack: ParsedAnimationPack, rendered: RenderedAnimationPack) => {
      const current = petRef.current;
      if (!current) {
        throw new Error(t('app.error.petLoad'));
      }

      const stored: StoredAnimationPack = {
        manifest: pack.manifest,
        frames: pack.frames,
        appliedAt: Date.now(),
      };

      try {
        await repository.saveAnimationPack(current.id, stored);
      } catch {
        throw new Error(
          t('animation.error.save'),
        );
      }

      setStoredAnimationPack(stored);
      setRenderedAnimationPack(rendered);
      renderedPackRef.current = rendered;
      setAnimationPackError(false);
      showToast(t('app.customAnimation.applied'), 'success');
    },
    [showToast],
  );

  const handleRemoveAnimationPack = useCallback(async () => {
    const current = petRef.current;
    if (!current) {
      return;
    }

    try {
      await repository.deleteAnimationPack(current.id);
    } catch {
      throw new Error(t('animation.error.remove'));
    }

    setStoredAnimationPack(null);
    setRenderedAnimationPack(null);
    renderedPackRef.current = null;
    setAnimationPackError(false);
    showToast(t('app.customAnimation.removed'), 'info');
  }, [showToast]);

  const handleReset = useCallback(async () => {
    resettingRef.current = true;
    try {
      await saveChainRef.current.catch(() => undefined);
      await preferencesChainRef.current.catch(() => undefined);
      const current = petRef.current;
      if (current) {
        await repository.deleteAnimationPack(current.id);
      }
      await repository.deletePet();
      clearAppLocalStorage();
      lastActionRef.current = {};
      remindersRef.current = emptyReminderTimes();

      if (!mountedRef.current) {
        return;
      }

      petRef.current = null;
      setPet(null);
      setStoredAnimationPack(null);
      setRenderedAnimationPack(null);
      renderedPackRef.current = null;
      setAnimationPackError(false);
      setStartupError(null);
      setStorageWarning(null);
      setSettingsOpen(false);
      setAnimationDialogOpen(false);
      setHighlightAction(null);
      clearTransient();
      setScreen('adoption');
      setToast({
        id: nextToastId(),
        text: t('app.resetPet'),
        kind: 'info',
      });
    } catch (error) {
      if (mountedRef.current) {
        setStorageWarning(describeStorageError(error));
      }
    } finally {
      resettingRef.current = false;
    }
  }, [clearTransient, nextToastId]);

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
      setStoredAnimationPack(null);
      setRenderedAnimationPack(null);
      renderedPackRef.current = null;
      setAnimationPackError(false);
      preferencesRef.current = DEFAULT_PREFERENCES;
      setPreferences(DEFAULT_PREFERENCES);
      setLocale(DEFAULT_PREFERENCES.locale);
      setStartupError(null);
      setStorageWarning(null);
      setSettingsOpen(false);
      setAnimationDialogOpen(false);
      setHighlightAction(null);
      clearTransient();
      setScreen('adoption');
      setToast({
        id: nextToastId(),
        text: t('app.deleteAll'),
        kind: 'info',
      });
    } finally {
      resettingRef.current = false;
    }
  }, [clearTransient, nextToastId]);

  const handleRetry = useCallback(() => {
    setStartupError(null);
    setScreen('loading');
    setReloadKey((key) => key + 1);
  }, []);

  const animationState: AnimationState =
    transientAnimation ?? (pet ? persistentAnimationFor(pet.activity) : 'idle');
  const shellClass = `app-shell${reducedMotion ? ' motion-reduced' : ''}`;
  const showInstallBanner =
    !install.installed &&
    !installDismissed &&
    (install.canPrompt || install.isIos);
  const installBanner = showInstallBanner ? (
    <InstallBanner
      canInstall={install.canPrompt}
      isIos={install.isIos}
      onInstall={handleInstall}
      onDismiss={handleDismissInstall}
    />
  ) : null;

  const feedbackBars = (
    <>
      {storageWarning && (
        <div className="storage-warning" role="alert">
          <span>{storageWarning}</span>
          <button
            type="button"
            className="message-dismiss"
            onClick={() => setStorageWarning(null)}
            aria-label={t('common.dismiss')}
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
            aria-label={t('common.dismiss')}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );

  if (screen === 'loading') {
    return (
      <main className={shellClass}>
        <div className="loading-screen" role="status" aria-live="polite">
          <div className="loading-dot" aria-hidden="true" />
          <p>{t('app.loading')}</p>
        </div>
      </main>
    );
  }

  if (screen === 'error' && startupError) {
    return (
      <main className={shellClass}>
        <div className="error-screen">
          <h1>{startupError.title}</h1>
          <p>{startupError.message}</p>
          <div className="error-actions">
            <button type="button" className="primary-button" onClick={handleRetry}>
              {t('app.retry')}
            </button>
            {startupError.canReset && (
              <button type="button" className="danger-button" onClick={handleReset}>
                {t('app.resetSavedData')}
              </button>
            )}
          </div>
          {startupError.canReset && (
            <p className="error-hint">
              {t('app.resetSavedData.hint')}
            </p>
          )}
        </div>
      </main>
    );
  }

  if (screen === 'adoption') {
    return (
      <main className={shellClass}>
        {installBanner}
        {feedbackBars}
        <AdoptionScreen onAdopt={handleAdopt} />
      </main>
    );
  }

  if (!pet) {
    return (
      <main className={shellClass}>
        <div className="error-screen">
          <h1>{t('app.error.title')}</h1>
          <p>{t('app.error.petLoad')}</p>
          <button type="button" className="primary-button" onClick={handleRetry}>
            {t('app.retry')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      {installBanner}
      {feedbackBars}

      <PetScreen
        pet={pet}
        animationState={animationState}
        renderedAnimationPack={renderedAnimationPack}
        reducedMotion={reducedMotion}
        onAction={handleAction}
        onOpenSettings={() => setSettingsOpen(true)}
        highlightAction={highlightAction}
      />

      <SettingsDialog
        open={settingsOpen}
        preferences={preferences}
        systemReducedMotion={systemReducedMotion}
        canInstall={install.canPrompt}
        isIos={install.isIos}
        installed={install.installed}
        customAnimationName={storedAnimationPack?.manifest.name ?? null}
        customAnimationError={animationPackError}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSavePreferences}
        onLocaleChange={handleLocaleChange}
        onReset={handleReset}
        onDeleteDatabase={handleDeleteDatabase}
        onManageAnimation={() => {
          setSettingsOpen(false);
          setAnimationDialogOpen(true);
        }}
        onInstall={handleInstall}
      />

      <AnimationPackDialog
        open={animationDialogOpen}
        customPackName={storedAnimationPack?.manifest.name ?? null}
        customPackError={animationPackError}
        reducedMotion={reducedMotion}
        onClose={() => setAnimationDialogOpen(false)}
        onApply={handleApplyAnimationPack}
        onRemove={handleRemoveAnimationPack}
      />
    </main>
  );
}
