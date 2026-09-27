import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  about?: string;
  phone?: string;
  preferred_language?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  setLang: (lang: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const KEY = 'mosaic-auth';

async function save(token: string, user: AuthUser) {
  const raw = JSON.stringify({ token, user });
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(KEY, raw);
    } catch {}
  } else {
    await SecureStore.setItemAsync(KEY, raw);
  }
}

async function load(): Promise<{ token: string; user: AuthUser } | null> {
  try {
    const raw =
      Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function clear() {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasHydrated: false,
  setAuth: async (token, user) => {
    await save(token, user);
    set({ token, user });
  },
  setLang: (lang) =>
    set((s) => {
      if (!s.user) return s;
      const user = { ...s.user, preferred_language: lang };
      if (s.token) save(s.token, user);
      return { user };
    }),
  updateUser: (patch) =>
    set((s) => {
      if (!s.user) return s;
      const user = { ...s.user, ...patch };
      if (s.token) save(s.token, user);
      return { user };
    }),
  logout: async () => {
    await clear();
    set({ token: null, user: null });
  },
  hydrate: async () => {
    const data = await load();
    set({ token: data?.token ?? null, user: data?.user ?? null, hasHydrated: true });
  },
}));
