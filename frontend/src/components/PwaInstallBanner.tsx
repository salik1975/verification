
import { useEffect, useState, useCallback } from 'react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { Download, X, Share, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallBanner() {
  const { 
    isPromptAvailable, 
    promptInstall, 
    isAppInstalled, 
    isIOSDevice, 
    hasInstallPrompt,
    canPromptUser,
    lastPromptTime
  } = usePwaInstall();
  
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installAttempted, setInstallAttempted] = useState(false);
  const { toast } = useToast();

  const checkAndShowBanner = useCallback(() => {
    // Only show for mobile devices that aren't already installed
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice && !isAppInstalled && !dismissed && canPromptUser) {
      console.log('Showing banner for mobile device');
      setShowBanner(true);
    }
  }, [isAppInstalled, dismissed, canPromptUser]);

  // Check if banner was recently dismissed
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedTime) {
      const dismissedTimestamp = parseInt(dismissedTime, 10);
      const now = Date.now();
      // If it's been less than 24 hours since dismissal
      if (now - dismissedTimestamp < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      } else {
        // Reset dismissal after 24 hours
        localStorage.removeItem('pwa-banner-dismissed');
      }
    }
    
    // Check if it's a mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Auto-show prompt after a delay for better UX (only on mobile)
    if (isMobileDevice) {
      console.log('Mobile device detected, will show banner after delay if criteria met');
      const timer = setTimeout(() => {
        checkAndShowBanner();
      }, 3000); // 3 seconds delay
      
      return () => clearTimeout(timer);
    }
  }, [checkAndShowBanner]);

  // Monitor for changes in prompt availability
  useEffect(() => {
    // Log prompt status for debugging
    console.log('PWA Banner - Prompt status changed:', {
      hasInstallPrompt,
      installAttempted,
      isAppInstalled,
      dismissed,
      canPromptUser
    });
    
    if (hasInstallPrompt && !installAttempted && !isAppInstalled && !dismissed && canPromptUser) {
      console.log('Install prompt available and criteria met - showing banner');
      checkAndShowBanner();
    }
  }, [hasInstallPrompt, installAttempted, isAppInstalled, dismissed, canPromptUser, checkAndShowBanner]);

  // This is crucial for debugging
  useEffect(() => {
    console.log("PWA Banner Debug:", { 
      isPromptAvailable, 
      isAppInstalled, 
      showBanner,
      dismissed,
      isIOSDevice,
      hasInstallPrompt,
      canPromptUser,
      lastPromptTime: lastPromptTime ? new Date(lastPromptTime).toISOString() : null,
      userAgent: navigator.userAgent,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      installEventCaptured: localStorage.getItem('pwa-install-event-captured') === 'true',
      deferredPromptExists: !!(window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt
    });
  }, [isPromptAvailable, isAppInstalled, showBanner, dismissed, isIOSDevice, hasInstallPrompt, canPromptUser, lastPromptTime]);

  const handleInstall = async () => {
    try {
      setInstallAttempted(true);
      console.log('Install button clicked', { 
        hasInstallPrompt, 
        isIOSDevice,
        deferredPrompt: (window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt
      });
      
      const result = await promptInstall();
      console.log('Install result:', result);

      if (result.outcome === 'accepted') {
        setShowBanner(false);
        toast({
          title: "Installation Successful",
          description: "VeraFi.Me has been added to your home screen!",
          duration: 3000,
        });
      } else if (result.outcome === 'ios-instructions' || (result.outcome === 'no-prompt' && result.manual)) {
        // Show manual instructions for iOS or when the prompt isn't available
        if (isIOSDevice) {
          toast({
            title: "Install on iOS",
            description: "1. Tap the Share button (⬆️) at the bottom\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to confirm",
            duration: 15000,
          });
        } else {
          // For Android, try to force trigger the install prompt
          const deferredPrompt = (window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
          if (deferredPrompt) {
            console.log('Trying to use global deferredPrompt');
            try {
              await deferredPrompt.prompt();
              const userChoice = await deferredPrompt.userChoice;
              console.log('User choice after direct prompt:', userChoice);
              (window as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt = undefined;
              
              if (userChoice.outcome === 'accepted') {
                toast({
                  title: "Installation Successful",
                  description: "VeraFi.Me has been added to your home screen!",
                  duration: 3000,
                });
                return;
              }
            } catch (err) {
              console.error('Error using deferredPrompt:', err);
            }
          }
          
          // If the direct prompt failed, show manual instructions
          const isChrome = /Chrome/.test(navigator.userAgent);
          const isSamsung = /SamsungBrowser/.test(navigator.userAgent);
          
          let instructions = "To install this app:\n";
          if (isChrome) {
            instructions += "1. Tap the menu (⋮) in the top right\n2. Select 'Install app' or 'Add to Home screen'\n3. Follow the prompts";
          } else if (isSamsung) {
            instructions += "1. Tap the menu (⋮) in the bottom right\n2. Select 'Add page to' then 'Home screen'\n3. Tap 'Add' to confirm";
          } else {
            instructions += "Look for 'Add to Home Screen' or 'Install app' in your browser's menu";
          }
          
          toast({
            title: "Manual Installation",
            description: instructions,
            duration: 15000,
          });
        }
      }
    } catch (err) {
      console.error('Error installing PWA:', err);
      toast({
        title: "Installation Error",
        description: "Please try installing manually from your browser menu",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Don't show if already installed
  if (isAppInstalled) return null;

  // Don't show if dismissed
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="container max-w-md mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Install VeraFi.Me App
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Get the full app experience on your device
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={handleDismiss} className="p-2 h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
          <Button size="sm" onClick={handleInstall} className="gap-1 h-8 bg-primary flex-shrink-0">
            {isIOSDevice ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            <span className="text-xs">Install</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
