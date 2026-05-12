import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigService } from '@/services/configService';
import AcuCheckLogoIcon from '@/assets/AcuCheck-LogoIcon.png';
import { useAuth } from './AuthContext';

interface AppearanceSettings {
  productLogo: string;
  productNameImage: string;
  productName: string;
  primaryColor: string;
  hasNameImage: boolean;
}

interface AppearanceContextType {
  appearance: AppearanceSettings;
  loading: boolean;
  error: string | null;
  refreshAppearance: () => Promise<void>;
}

const defaultAppearance: AppearanceSettings = {
  productLogo: AcuCheckLogoIcon,
  productNameImage: '',
  productName: 'VeraFi.Me',
  primaryColor: '#6478CF',
  hasNameImage: false,
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadAppearanceSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading - increased to 10 seconds for slower connections
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 second timeout
      });
      
      const appearanceData = await Promise.race([
        ConfigService.getAppearanceSettings(),
        timeoutPromise
      ]);
      
      setAppearance({
        productLogo: appearanceData.productLogo || AcuCheckLogoIcon,
        productNameImage: appearanceData.productNameImage || '',
        productName: appearanceData.productName || 'VeraFi.Me',
        primaryColor: appearanceData.primaryColor || '#6478CF',
        hasNameImage: !!appearanceData.productNameImage,
      });
    } catch (err) {
      console.error('Failed to load appearance settings:', err);
      setError('Failed to load appearance settings');
      // Keep default values on error - this ensures the app still works
      setAppearance(defaultAppearance);
    } finally {
      setLoading(false);
    }
  };

  const refreshAppearance = async () => {
    await loadAppearanceSettings();
  };

  // Watch for authentication changes and refresh appearance settings
  useEffect(() => {
    loadAppearanceSettings();
  }, [user]); // Re-run when user state changes

  return (
    <AppearanceContext.Provider value={{
      appearance,
      loading,
      error,
      refreshAppearance,
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
}
