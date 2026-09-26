/**
 * Zustand auth store — manages authentication state (token + user).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  preferred_language: string;
  username?: string;
  avatar_url?: string;
  about?: string;
  phone?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  updatePreferredLanguage: (lang: string) => void;
  updateUserProfile: (profile: Partial<User>) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: (token, user) => set({ token, user }),
      updatePreferredLanguage: (lang: string) =>
        set((state) => ({
          user: state.user ? { ...state.user, preferred_language: lang } : null,
        })),
      updateUserProfile: (profile: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),
      logout: () => set({ token: null, user: null }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
