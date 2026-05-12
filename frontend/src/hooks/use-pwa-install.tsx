
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UsePwaInstallResult {
  isPromptAvailable: boolean;
  isAppInstalled: boolean;
  promptInstall: () => Promise<{ outcome: string; manual: boolean; error?: Error | unknown }>;
  isIOSDevice: boolean;
  hasInstallPrompt: boolean;
  canPromptUser: boolean;
  lastPromptTime: number | null;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [canPromptUser, setCanPromptUser] = useState(true);
  const [lastPromptTime, setLastPromptTime] = useState<number | null>(null);

  useEffect(() => {
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOSDevice(isIOS);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as { standalone?: boolean }).standalone === true;
    setIsAppInstalled(isStandalone);

    // Load last prompt time
    const storedPromptTime = localStorage.getItem('pwa-last-prompt-time');
    if (storedPromptTime) {
      const promptTime = parseInt(storedPromptTime, 10);
      setLastPromptTime(promptTime);

      // Allow prompting again after 1 hour
      if (Date.now() - promptTime < 60 * 60 * 1000) {
        setCanPromptUser(false);
      }
    }

    // Check for existing global prompt
    if ((window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt) {
      setInstallPrompt((window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt as BeforeInstallPromptEvent);
    }

    // Listen for custom PWA install event
    const handlePwaInstallAvailable = (event: Event) => {
      setInstallPrompt((event as CustomEvent<BeforeInstallPromptEvent>).detail);
    };

    window.addEventListener('pwa-install-available', handlePwaInstallAvailable);

    // Handle app installed
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handlePwaInstallAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    // Save last prompt time
    const now = Date.now();
    localStorage.setItem('pwa-last-prompt-time', now.toString());
    setLastPromptTime(now);
    setCanPromptUser(false);

    // Get the prompt (try local first, then global)
    const promptToUse = installPrompt || (window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;

    if (promptToUse && !isIOSDevice) {
      try {
        await promptToUse.prompt();

        const choiceResult = await promptToUse.userChoice;

        // Clean up
        setInstallPrompt(null);
        (window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt = undefined;

        return {
          outcome: choiceResult.outcome,
          manual: false
        };
      } catch (error) {
        console.error('Error during PWA install prompt:', error);
        return { outcome: 'error', manual: true, error };
      }
    }

    // For iOS devices
    if (isIOSDevice) {
      return { outcome: 'ios-instructions', manual: true };
    }

    // No prompt available
    return { outcome: 'no-prompt', manual: true };
  };

  return {
    isPromptAvailable: !!installPrompt || !!(window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt || isIOSDevice,
    isAppInstalled,
    promptInstall,
    isIOSDevice,
    hasInstallPrompt: !!installPrompt || !!(window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt,
    canPromptUser,
    lastPromptTime
  };
}
