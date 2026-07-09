import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccentKey, DEFAULT_ACCENT, Theme, buildTheme } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme_settings_v1';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  accentKey: AccentKey;
  setAccentKey: (k: AccentKey) => void;
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentKey, setAccentKeyState] = useState<AccentKey>(DEFAULT_ACCENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.mode) setModeState(parsed.mode);
          if (parsed.accentKey) setAccentKeyState(parsed.accentKey);
        }
      } catch {
        // ignore corrupt storage, fall back to defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, accentKey })).catch(() => {});
  }, [mode, accentKey, loaded]);

  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);
  const setAccentKey = useCallback((k: AccentKey) => setAccentKeyState(k), []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = useMemo(() => buildTheme(isDark, accentKey), [isDark, accentKey]);

  const value = useMemo(
    () => ({ mode, setMode, accentKey, setAccentKey, theme, isDark }),
    [mode, setMode, accentKey, setAccentKey, theme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
