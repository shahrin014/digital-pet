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
import { useTranslation, type Locale } from '../i18n';

export interface SettingsDialogProps {
  open: boolean;
  preferences: Preferences;
  systemReducedMotion: boolean;
  canInstall: boolean;
  isIos: boolean;
  installed: boolean;
  customAnimationName?: string | null;
  customAnimationError?: boolean;
  onClose: () => void;
  onSave: (preferences: Preferences) => void;
  onReset: () => void | Promise<void>;
  onDeleteDatabase: () => void | Promise<void>;
  onManageAnimation: () => void;
  onInstall: () => void | Promise<void>;
  onLocaleChange: (locale: Locale) => void;
}

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
  canInstall,
  isIos,
  installed,
  customAnimationName,
  customAnimationError = false,
  onClose,
  onSave,
  onReset,
  onDeleteDatabase,
  onManageAnimation,
  onInstall,
  onLocaleChange,
}: SettingsDialogProps) {
  const { t } = useTranslation();
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
      setNotificationMessage(t('settings.notifications.unsupported'));
      return;
    }

    if (window.Notification.permission === 'denied') {
      setBrowserNotifications(false);
      setNotificationMessage(t('settings.notifications.denied'));
      return;
    }

    if (
      preferences.browserNotifications &&
      window.Notification.permission !== 'granted'
    ) {
      setBrowserNotifications(false);
      setNotificationMessage(t('settings.notifications.needsPermission'));
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
      setNotificationMessage(t('settings.notifications.unsupported'));
      return;
    }

    if (window.Notification.permission === 'denied') {
      setBrowserNotifications(false);
      setNotificationMessage(t('settings.notifications.denied'));
      return;
    }

    if (window.Notification.permission === 'granted') {
      setBrowserNotifications(true);
      setNotificationMessage(
        t('settings.notifications.enabled', {
          bestEffort: t('settings.notifications.bestEffort'),
        }),
      );
      return;
    }

    setRequestingPermission(true);
    try {
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        setBrowserNotifications(true);
        setNotificationMessage(
          t('settings.notifications.enabled', {
            bestEffort: t('settings.notifications.bestEffort'),
          }),
        );
      } else if (permission === 'denied') {
        setBrowserNotifications(false);
        setNotificationMessage(t('settings.notifications.denied'));
      } else {
        setBrowserNotifications(false);
        setNotificationMessage(t('settings.notifications.notEnabled'));
      }
    } catch {
      setBrowserNotifications(false);
      setNotificationMessage(t('settings.notifications.requestFailed'));
    } finally {
      setRequestingPermission(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (quietHoursEnabled && (!quietStart || !quietEnd)) {
      setError(t('settings.quiet.error'));
      return;
    }

    onSave({
      browserNotifications,
      quietHoursEnabled,
      quietStart: quietStart || preferences.quietStart,
      quietEnd: quietEnd || preferences.quietEnd,
      motion,
      locale: preferences.locale,
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
      setDangerError(t('settings.reset.error'));
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
      setDangerError(t('settings.delete.error'));
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
            <h2 id={titleId}>{t('settings.title')}</h2>
            <p id={descriptionId} className="settings-dialog__lede">
              {t('settings.lede')}
            </p>
          </div>
          <button
            type="button"
            className="icon-button settings-dialog__close"
            onClick={onClose}
            aria-label={t('settings.close')}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <form className="settings-form" onSubmit={handleSubmit} noValidate>
          <section className="settings-section install-section" aria-labelledby={`${idPrefix}-install`}>
            <h3 id={`${idPrefix}-install`}>{t('settings.install.title')}</h3>
            {installed ? (
              <p className="settings-note">
                {t('settings.install.installed')}
              </p>
            ) : canInstall ? (
              <>
                <p className="settings-note">
                  {t('settings.install.available')}
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    void onInstall();
                  }}
                >
                  {t('settings.install.button')}
                </button>
              </>
            ) : isIos ? (
              <p className="settings-note">
                {t('settings.install.ios')}
              </p>
            ) : (
              <p className="settings-note">
                {t('settings.install.other')}
              </p>
            )}
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-language`}>
            <h3 id={`${idPrefix}-language`}>{t('settings.language.title')}</h3>
            <p className="settings-note">{t('settings.language.note')}</p>
            <label className="motion-field">
              <span className="motion-field__label">
                {t('settings.language.title')}
              </span>
              <select
                className="text-input"
                value={preferences.locale}
                onChange={(event) => {
                  onLocaleChange(event.target.value as Locale);
                }}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </label>
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-notifications`}>
            <h3 id={`${idPrefix}-notifications`}>{t('settings.notifications.title')}</h3>
            <label className="toggle-row">
              <span className="toggle-row__text">
                <span className="toggle-row__label">{t('settings.notifications.label')}</span>
                <span className="toggle-row__hint" id={`${idPrefix}-notifications-hint`}>
                  {t('settings.notifications.hint')}
                </span>
              </span>
              <input
                className="toggle-input"
                type="checkbox"
                checked={browserNotifications}
                disabled={requestingPermission}
                aria-label={t('settings.notifications.label')}
                aria-describedby={`${idPrefix}-notifications-hint`}
                onChange={(event) => {
                  void handleNotificationToggle(event.target.checked);
                }}
              />
            </label>
            <p className="settings-note">
              {t('settings.notifications.note')}
            </p>
            {notificationMessage && (
              <p className="settings-status" role="status" aria-live="polite">
                {notificationMessage}
              </p>
            )}
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-quiet`}>
            <h3 id={`${idPrefix}-quiet`}>{t('settings.quiet.title')}</h3>
            <label className="toggle-row">
              <span className="toggle-row__text">
                <span className="toggle-row__label">{t('settings.quiet.label')}</span>
                <span className="toggle-row__hint" id={`${idPrefix}-quiet-hint`}>
                  {t('settings.quiet.hint')}
                </span>
              </span>
              <input
                className="toggle-input"
                type="checkbox"
                checked={quietHoursEnabled}
                aria-label={t('settings.quiet.label')}
                aria-describedby={`${idPrefix}-quiet-hint`}
                onChange={(event) => {
                  setQuietHoursEnabled(event.target.checked);
                }}
              />
            </label>
            <div className="time-fields">
              <label className="time-field">
                <span className="time-field__label">{t('settings.quiet.start')}</span>
                <input
                  className="time-input"
                  type="time"
                  value={quietStart}
                  onChange={(event) => setQuietStart(event.target.value)}
                />
              </label>
              <label className="time-field">
                <span className="time-field__label">{t('settings.quiet.end')}</span>
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
            <h3 id={`${idPrefix}-motion`}>{t('settings.motion.title')}</h3>
            <label className="motion-field">
              <span className="motion-field__label">{t('settings.motion.label')}</span>
              <select
                className="text-input"
                value={motion}
                onChange={(event) => {
                  setMotion(event.target.value as MotionPreference);
                }}
              >
                <option value="system">{t('settings.motion.system')}</option>
                <option value="full">{t('settings.motion.full')}</option>
                <option value="reduced">{t('settings.motion.reduced')}</option>
              </select>
            </label>
            {systemReducedMotion && motion === 'system' && (
              <p className="settings-status" role="status">
                {t('settings.motion.notice')}
              </p>
            )}
            {motion === 'reduced' && (
              <p className="settings-note">{t('settings.motion.reducedNote')}</p>
            )}
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-appearance`}>
            <h3 id={`${idPrefix}-appearance`}>{t('settings.appearance.title')}</h3>
            <p className="settings-note">
              {customAnimationName
                ? t('settings.appearance.custom', { name: customAnimationName })
                : t('settings.appearance.builtIn')}
            </p>
            {customAnimationError && (
              <p className="settings-status" role="alert">
                {t('settings.appearance.error')}
              </p>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={onManageAnimation}
            >
              {t('settings.appearance.manageAnimation')}
            </button>
          </section>

          <section className="settings-section" aria-labelledby={`${idPrefix}-data`}>
            <h3 id={`${idPrefix}-data`}>{t('settings.data.title')}</h3>
            <p className="settings-note">
              {t('settings.data.note')}
            </p>
          </section>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="settings-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              {t('settings.cancel')}
            </button>
            <button type="submit" className="primary-button">
              {t('settings.save')}
            </button>
          </div>

          <section
            className="settings-section danger-zone"
            aria-labelledby={`${idPrefix}-reset`}
          >
            <h3 id={`${idPrefix}-reset`}>{t('settings.reset.title')}</h3>
            {!confirmReset ? (
              <>
                <p className="settings-note">
                  {t('settings.reset.note')}
                </p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setConfirmReset(true);
                    setDangerError(null);
                  }}
                >
                  {t('settings.reset.button')}
                </button>
              </>
            ) : (
              <div
                className="danger-confirm"
                role="group"
                aria-label={t('settings.reset.confirmAria')}
              >
                <p className="danger-zone__warning">
                  <strong>
                    {t('settings.reset.confirm')}
                  </strong>
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
                    {resetting ? t('settings.reset.resetting') : t('settings.reset.confirmButton')}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setConfirmReset(false);
                      setDangerError(null);
                    }}
                  >
                    {t('settings.reset.cancelButton')}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section
            className="settings-section danger-zone danger-zone--database"
            aria-labelledby={`${idPrefix}-delete-database`}
          >
            <h3 id={`${idPrefix}-delete-database`}>{t('settings.delete.title')}</h3>
            {!confirmDeleteDatabase ? (
              <>
                <p className="settings-note">
                  {t('settings.delete.note')}
                </p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setConfirmDeleteDatabase(true);
                    setDangerError(null);
                  }}
                >
                  {t('settings.delete.button')}
                </button>
              </>
            ) : (
              <div
                className="danger-confirm"
                role="group"
                aria-label={t('settings.delete.confirmAria')}
              >
                <p className="danger-zone__warning">
                  <strong>
                    {t('settings.delete.confirm')}
                  </strong>
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
                      ? t('settings.delete.deleting')
                      : t('settings.delete.confirmButton')}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setConfirmDeleteDatabase(false);
                      setDangerError(null);
                    }}
                  >
                    {t('settings.delete.cancelButton')}
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
