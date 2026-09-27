import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  hydrate: (systemScheme: 'light' | 'dark') => Promise<void>;
}

const KEY = 'mosaic-theme-mode';

async function saveMode(mode: ThemeMode) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, mode);
    } else {
      await SecureStore.setItemAsync(KEY, mode);
    }
  } catch {}
}

async function loadMode(): Promise<ThemeMode | null> {
  try {
    const raw =
      Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    return null;
  } catch {
    return null;
  }
}

function resolve(mode: ThemeMode, system: 'light' | 'dark'): 'light' | 'dark' {
  return mode === 'system' ? system : mode;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: 'light',
  setMode: async (mode) => {
    await saveMode(mode);
    // resolved will be recomputed by callers with current system scheme;
    // optimistically keep system fallback
    const cur = get().resolved;
    set({ mode, resolved: mode === 'system' ? cur : mode });
  },
  toggleTheme: async () => {
    const cur = get().resolved;
    const next = cur === 'light' ? 'dark' : 'light';
    await saveMode(next);
    set({ mode: next, resolved: next });
  },
  hydrate: async (systemScheme) => {
    const saved = await loadMode();
    const mode = saved ?? 'system';
    set({ mode, resolved: resolve(mode, systemScheme) });
  },
}));

/** Helper: returns the resolved scheme honouring manual override + system. */
export function useAppTheme(systemScheme: 'light' | 'dark'): 'light' | 'dark' {
  const resolved = useThemeStore((s) => s.resolved);
  return resolved ?? systemScheme;
}
