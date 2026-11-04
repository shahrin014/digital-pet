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
  const message = canInstall
    ? 'Add it to your home screen for full-screen, offline play.'
    : isIos
      ? 'Tap Share, then Add to Home Screen.'
      : 'Use your browser menu to add it to your home screen.';

  return (
    <aside className="install-banner" aria-label="Install Digital Pet">
      <div className="install-banner__text">
        <strong>Install Digital Pet</strong>
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
            Install
          </button>
        )}
        <button
          type="button"
          className="message-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
