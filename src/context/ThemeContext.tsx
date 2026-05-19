import React, { createContext, useContext, useState, useEffect } from 'react';
import { ColorScheme } from '../types';
import { COLOR_SCHEMES } from '../constants/theme';

interface ThemeContextValue {
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
  colors: (typeof COLOR_SCHEMES)[ColorScheme];
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'crimson',
  setScheme: () => {},
  colors: COLOR_SCHEMES.crimson,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>('crimson');

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem('oki_color_scheme');
        if (saved && (saved === 'crimson' || saved === 'teal' || saved === 'indigo')) {
          setSchemeState(saved as ColorScheme);
        }
      }
    } catch {
      // noop
    }
  }, []);

  const setScheme = (s: ColorScheme) => {
    setSchemeState(s);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('oki_color_scheme', s);
      }
    } catch {
      // noop
    }
  };

  return (
    <ThemeContext.Provider value={{ scheme, setScheme, colors: COLOR_SCHEMES[scheme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
