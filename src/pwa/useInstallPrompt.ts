import { useCallback, useEffect, useState } from 'react';
import {
  isIosUserAgent,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from './install';

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [isIos] = useState(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return isIosUserAgent(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    );
  });

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      if (typeof promptEvent.prompt !== 'function') {
        return;
      }
      event.preventDefault();
      setDeferred(promptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    const displayMode = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => {
      setInstalled(isStandaloneDisplay());
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferred) {
      return 'unavailable';
    }

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
      return choice.outcome;
    } catch {
      setDeferred(null);
      return 'dismissed';
    }
  }, [deferred]);

  return {
    canPrompt: deferred !== null,
    installed,
    isIos,
    promptInstall,
  };
}
