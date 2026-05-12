import { useEffect } from 'react';
import { useAppearance } from './contexts/AppearanceContext';
import { useThemeColor } from '@/hooks/use-theme-color';

export function AppearanceCSSInjector() {
  const { appearance } = useAppearance();
  const { themeColor } = useThemeColor();

  useEffect(() => {
    // Convert hex color to HSL for CSS variables
    const hexToHSL = (hex: string) => {
      // Remove # if present
      hex = hex.replace('#', '');
      
      // Parse RGB values
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      };
    };

    // The ThemeColorProvider now handles all color management
    // This injector is kept for compatibility but doesn't interfere with theme system
  }, [appearance.primaryColor, themeColor]);

  return null; // This component doesn't render anything
}
