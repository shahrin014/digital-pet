import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import type { MotionPreference, Preferences } from '../game/types';

export interface SettingsDialogProps {
  open: boolean;
  preferences: Preferences;
  systemReducedMotion: boolean;
  customAnimationName?: string | null;
  customAnimationError?: boolean;
  onClose: () => void;
  onSave: (preferences: Preferences) => void;
  onReset: () => void | Promise<void>;
  onDeleteDatabase: () => void | Promise<void>;
  onManageAnimation: () => void;
}

const NOTIFICATION_BEST_EFFORT =
  'Browser notifications are best-effort. Your browser or device may delay or skip them, especially while the app is closed.';
const DENIED_MESSAGE =
  'Browser notifications are blocked for this site. You can allow them again in your browser’s site settings.';
const UNSUPPORTED_MESSAGE =
  'This browser does not support notifications. In-app reminders will still appear while the app is open.';

function supportsNotifications(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof window.Notification.requestPermission === 'function'
  );
}

export function SettingsDialog({
  open,
  preferences,
  systemReducedMotion,
  customAnimationName,
  customAnimationError = false,
  onClose,
  onSave,
  onReset,
  onDeleteDatabase,
  onManageAnimation,
}: SettingsDialogProps) {
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const notificationSupported = supportsNotifications();

  const [browserNotifications, setBrowserNotifications] = useState(
    preferences.browserNotifications,
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    preferences.quietHoursEnabled,
  );
  const [quietStart, setQuietStart] = useState(preferences.quietStart);
  const [quietEnd, setQuietEnd] = useState(preferences.quietEnd);
  const [motion, setMotion] = useState<MotionPreference>(preferences.motion);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null,
  );
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDeleteDatabase, setConfirmDeleteDatabase] = useState(false);
  const [deletingDatabase, setDeletingDatabase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dangerError, setDangerError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          try {
            dialog.showModal();
          } catch {
            dialog.setAttribute('open', '');
          }
        } else {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setBrowserNotifications(preferences.browserNotifications);
    setQuietHoursEnabled(preferences.quietHoursEnabled);
    setQuietStart(preferences.quietStart);
    setQuietEnd(preferences.quietEnd);
    setMotion(preferences.motion);
    setConfirmReset(false);
    setResetting(false);
    setConfirmDeleteDatabase(false);
    setDeletingDatabase(false);
    setError(null);
    setDangerError(null);
    setRequestingPermission(false);

    if (!notificationSupported) {
      setBrowserNotifications(false);
      setNotificationMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    if (window.Notification.permission === 'denied') {
      setBrowserNotifications(false);
      setNotificationMessage(DENIED_MESSAGE);
      return;
    }

    if (
      preferences.browserNotifications &&
      window.Notification.permission !== 'granted'
    ) {
      setBrowserNotifications(false);
      setNotificationMessage(
        'Browser notifications need permission again. Turn the switch on to allow them.',
      );
      return;
    }

    setNotificationMessage(null);
  }, [notificationSupported, open, preferences]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  async function handleNotificationToggle(checked: boolean) {
    setError(null);

    if (!checked) {
      setBrowserNotifications(false);
      setNotificationMessage(null);
      return;
    }

    if (!notificationSupported) {
      setBrowserNotifications(false);
      setNotificationMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    if (window.Notification.permission === 'denied') {
      setBrowserNotifications(false);
      setNotificationMessage(DENIED_MESSAGE);
      return;
    }

    if (window.Notification.permission === 'granted') {
      setBrowserNotifications(true);
      setNotificationMessage(
        `Browser notifications are on. ${NOTIFICATION_BEST_EFFORT}`,
      );
      return;
    }

    setRequestingPermission(true);
    try {
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        setBrowserNotifications(true);
        setNotificationMessage(
          `Browser notifications are on. ${NOTIFICATION_BEST_EFFORT}`,
        );
      } else if (permission === 'denied') {
        setBrowserNotifications(false);
        setNotificationMessage(DENIED_MESSAGE);
      } else {
        setBrowserNotifications(false);
        setNotificationMessage(
          'Notifications were not enabled. You can turn the switch on again to ask your browser.',
        );
      }
    } catch {
      setBrowserNotifications(false);
      setNotificationMessage(
        'Your browser could not request notification permission. In-app reminders will still appear while the app is open.',
      );
    } finally {
      setRequestingPermission(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (quietHoursEnabled && (!quietStart || !quietEnd)) {
      setError('Please choose both a quiet-hours start and end time.');
      return;
    }

    onSave({
      browserNotifications,
      quietHoursEnabled,
      quietStart: quietStart || preferences.quietStart,
      quietEnd: quietEnd || preferences.quietEnd,
      motion,
    });
    onClose();
  }

  async function handleResetPet() {
    setResetting(true);
    setDangerError(null);
    try {
      await onReset();
      onClose();
    } catch {
      setDangerError(
        'Your pet could not be reset. Your saved pet is unchanged.',
      );
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteDatabase() {
    setDeletingDatabase(true);
    setDangerError(null);
    try {
      await onDeleteDatabase();
      onClose();
    } catch {
      setDangerError(
        'The local database could not be deleted. Close any other Digital Pet tabs and try again.',
      );
    } finally {
      setDeletingDatabase(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="settings-dialog__panel">
        <header className="settings-dialog__header">
          <div>
            <h2 id={titleId}>Settings</h2>
            <p id={descriptionId} className="settings-dialog__lede">
              Reminders, quiet hours and your local save.
            </p>
          </div>
          <button
            type="button"
            className="icon-button settings-dialog__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <form className="settings-form" onSubmit={handleSubmit} noValidate>
          <section className="settings-section" aria-labelledby={`${idPrefix}-notifications`}>
            <h3 id={`${idPrefix}-notifications`}>Notifications</h3>
            <label className="toggle-row">
              <span className="toggle-row__text">
                <span className="toggle-row__label">Browser notifications</span>
                <span className="toggle-row__hint" id={`${idPrefix}-notifications-hint`}>
                  Off by default. The browser asks for permission only when you
                  turn this on.
                </span>
              </span>
              <input
                className="toggle-input"
                type="checkbox"
                checked={browserNotifications}
                disabled={requestingPermission}
                aria-label="Browser notifications"
                aria-describedby={`${idPrefix}-notifications-hint`}
                onChange={(event) => {
                  void handleNotificationToggle(event.target.checked);
                }}
              />
            </label>
            <p className="settings-note">
              Reminders depend on your browser and device. Delivery while the
              app is closed is not guaranteed.
            </p>
            {notificationMessage && (
              <p className="settings-status" role="status" aria-live="polite">
                {notificationMessage}
              </p>
            )}
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-quiet`}>
            <h3 id={`${idPrefix}-quiet`}>Quiet hours</h3>
            <label className="toggle-row">
              <span className="toggle-row__text">
                <span className="toggle-row__label">Quiet hours</span>
                <span className="toggle-row__hint" id={`${idPrefix}-quiet-hint`}>
                  Pause in-app and browser reminders during these hours.
                </span>
              </span>
              <input
                className="toggle-input"
                type="checkbox"
                checked={quietHoursEnabled}
                aria-label="Quiet hours"
                aria-describedby={`${idPrefix}-quiet-hint`}
                onChange={(event) => {
                  setQuietHoursEnabled(event.target.checked);
                }}
              />
            </label>
            <div className="time-fields">
              <label className="time-field">
                <span className="time-field__label">Start</span>
                <input
                  className="time-input"
                  type="time"
                  value={quietStart}
                  onChange={(event) => setQuietStart(event.target.value)}
                />
              </label>
              <label className="time-field">
                <span className="time-field__label">End</span>
                <input
                  className="time-input"
                  type="time"
                  value={quietEnd}
                  onChange={(event) => setQuietEnd(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-motion`}>
            <h3 id={`${idPrefix}-motion`}>Motion</h3>
            <label className="motion-field">
              <span className="motion-field__label">Animation preference</span>
              <select
                className="text-input"
                value={motion}
                onChange={(event) => {
                  setMotion(event.target.value as MotionPreference);
                }}
              >
                <option value="system">Use device setting</option>
                <option value="full">Always animate</option>
                <option value="reduced">Always reduce motion</option>
              </select>
            </label>
            {systemReducedMotion && motion === 'system' && (
              <p className="settings-status" role="status">
                Your device is requesting reduced motion, so activity animations
                are paused. Choose “Always animate” to see them.
              </p>
            )}
            {motion === 'reduced' && (
              <p className="settings-note">Activity animations are paused.</p>
            )}
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-appearance`}>
            <h3 id={`${idPrefix}-appearance`}>Pet appearance</h3>
            <p className="settings-note">
              {customAnimationName
                ? `Custom animation: ${customAnimationName}.`
                : 'Your pet is using the built-in species animation.'}
            </p>
            {customAnimationError && (
              <p className="settings-status" role="alert">
                The custom animation could not be loaded. The built-in animation
                is active.
              </p>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={onManageAnimation}
            >
              {customAnimationName
                ? 'Manage custom animation'
                : 'Upload animation pack'}
            </button>
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-data`}>
            <h3 id={`${idPrefix}-data`}>Your data</h3>
            <p className="settings-note">
              Your pet and progress are stored in this browser only. There is no
              account or cloud backup, and clearing your browser data permanently
              deletes them.
            </p>
          </section>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="settings-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Save settings
            </button>
          </div>

          <section
            className="settings-section danger-zone"
            aria-labelledby={`${idPrefix}-reset`}
          >
            <h3 id={`${idPrefix}-reset`}>Reset pet</h3>
            {!confirmReset ? (
              <>
                <p className="settings-note">
                  Start over with a new pet. Your current pet and progress are
                  deleted, but your notification and quiet-hour settings stay.
                </p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setConfirmReset(true);
                    setDangerError(null);
                  }}
                >
                  Reset pet
                </button>
              </>
            ) : (
              <div
                className="danger-confirm"
                role="group"
                aria-label="Confirm pet reset"
              >
                <p className="danger-zone__warning">
                  <strong>
                    This permanently deletes your pet and all progress.
                  </strong>{' '}
                  Your pet is stored only on this device, and clearing your
                  browser data will also delete it. This cannot be undone.
                </p>
                {dangerError && (
                  <p className="form-error" role="alert">
                    {dangerError}
                  </p>
                )}
                <div className="danger-zone__actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      void handleResetPet();
                    }}
                    disabled={resetting}
                  >
                    {resetting ? 'Resetting…' : 'Yes, delete permanently'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setConfirmReset(false);
                      setDangerError(null);
                    }}
                  >
                    Keep my pet
                  </button>
                </div>
              </div>
            )}
          </section>

          <section
            className="settings-section danger-zone danger-zone--database"
            aria-labelledby={`${idPrefix}-delete-database`}
          >
            <h3 id={`${idPrefix}-delete-database`}>Delete local database</h3>
            {!confirmDeleteDatabase ? (
              <>
                <p className="settings-note">
                  Delete the entire local database, including your pet,
                  progress, notification settings, and quiet hours. This cannot
                  be undone.
                </p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setConfirmDeleteDatabase(true);
                    setDangerError(null);
                  }}
                >
                  Delete local database
                </button>
              </>
            ) : (
              <div
                className="danger-confirm"
                role="group"
                aria-label="Confirm local database deletion"
              >
                <p className="danger-zone__warning">
                  <strong>
                    This permanently deletes all Digital Pet data on this
                    device.
                  </strong>{' '}
                  That includes your pet, progress, notification settings, quiet
                  hours, and reminder timestamps. This cannot be undone.
                </p>
                {dangerError && (
                  <p className="form-error" role="alert">
                    {dangerError}
                  </p>
                )}
                <div className="danger-zone__actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      void handleDeleteDatabase();
                    }}
                    disabled={deletingDatabase}
                  >
                    {deletingDatabase
                      ? 'Deleting…'
                      : 'Yes, delete all local data'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setConfirmDeleteDatabase(false);
                      setDangerError(null);
                    }}
                  >
                    Keep my data
                  </button>
                </div>
              </div>
            )}
          </section>
        </form>
      </div>
    </dialog>
  );
}
