import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme } from '../types';
import { COLOR_SCHEMES } from '../constants/theme';

const STORAGE_KEY = 'oki_color_scheme';

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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'crimson' || saved === 'teal' || saved === 'indigo') {
          setSchemeState(saved as ColorScheme);
        }
      })
      .catch(() => {});
  }, []);

  const setScheme = (s: ColorScheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
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
