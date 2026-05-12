
import { createContext, useContext, useEffect, useState } from "react";
import { useAppearance } from "@/components/contexts/AppearanceContext";

type ThemeColor = "lavender" | "flamingo" | "teal" | "green";

type ThemeColorProviderProps = {
  children: React.ReactNode;
  defaultThemeColor?: ThemeColor;
  storageKey?: string;
};

type ThemeColorProviderState = {
  themeColor: ThemeColor;
  setThemeColor: (themeColor: ThemeColor) => void;
};

// Temporary theme colors - these are only used for temporary override
const colors = {
  lavender: { 
    hex: "#7287fd",
    hsl: "228 49% 60%"
  },
  flamingo: { 
    hex: "#dd7878",
    hsl: "0 84% 67%"
  },
  teal: { 
    hex: "#179299",
    hsl: "183 69% 35%"
  },
  green: { 
    hex: "#40a02b",
    hsl: "142 52% 42%"
  },
};

const initialState: ThemeColorProviderState = {
  themeColor: "lavender",
  setThemeColor: () => null,
};

const ThemeColorProviderContext = createContext<ThemeColorProviderState>(initialState);

export function ThemeColorProvider({
  children,
  defaultThemeColor = "lavender",
  storageKey = "vite-ui-theme-color",
  ...props
}: ThemeColorProviderProps) {
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    // Always start with lavender to use backend color on page load
    const initial = defaultThemeColor;
    return initial;
  });
  const { appearance } = useAppearance();

  useEffect(() => {
    const root = window.document.documentElement;

    // Convert hex to HSL function
    const hexToHSL = (hex: string) => {
      hex = hex.replace('#', '');
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
    
    // Determine which color to use
    let effectiveColor: string;

    if (themeColor === "lavender") {
      // Use backend color (no temporary override)
      effectiveColor = appearance.primaryColor;
    } else {
      // Use temporary theme color
      effectiveColor = colors[themeColor].hex;
    }
    
    // Convert to HSL and apply
    const hsl = hexToHSL(effectiveColor);
    const hslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    
    // Set CSS custom properties
    root.style.setProperty('--primary', hslString);
    root.style.setProperty('--accent', hslString);
    root.style.setProperty('--ring', hslString);
    root.style.setProperty('--sidebar-primary', hslString);
  }, [themeColor, appearance.primaryColor]);

  const value = {
    themeColor,
    setThemeColor: (themeColor: ThemeColor) => {
      // Don't persist theme color - it should be temporary only
      setThemeColor(themeColor);
    },
  };

  return (
    <ThemeColorProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeColorProviderContext.Provider>
  );
}

const useThemeColor = () => {
  const context = useContext(ThemeColorProviderContext);

  if (context === undefined)
    throw new Error("useThemeColor must be used within a ThemeColorProvider");

  return context;
};

export { useThemeColor };
