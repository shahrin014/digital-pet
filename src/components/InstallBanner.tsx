import { useTranslation } from '../i18n';

export interface InstallBannerProps {
  canInstall: boolean;
  isIos: boolean;
  onInstall: () => void | Promise<void>;
  onDismiss: () => void;
}

export function InstallBanner({
  canInstall,
  isIos,
  onInstall,
  onDismiss,
}: InstallBannerProps) {
  const { t } = useTranslation();
  const message = canInstall
    ? t('install.available')
    : isIos
      ? t('install.ios')
      : t('install.other');

  return (
    <aside
      className="install-banner"
      aria-label={t('install.aria')}
    >
      <div className="install-banner__text">
        <strong>{t('install.title')}</strong>
        <span>{message}</span>
      </div>
      <div className="install-banner__actions">
        {canInstall && (
          <button
            type="button"
            className="primary-button install-banner__button"
            onClick={() => {
              void onInstall();
            }}
          >
            {t('install.button')}
          </button>
        )}
        <button
          type="button"
          className="message-dismiss"
          onClick={onDismiss}
          aria-label={t('install.dismiss')}
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
