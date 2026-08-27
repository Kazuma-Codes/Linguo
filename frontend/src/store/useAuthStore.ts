/**
 * Zustand auth store — manages authentication state (token + user).
 *
 * Uses the `persist` middleware so the token survives page reloads via
 * localStorage. `hasHydrated` is set once after rehydration so the UI can
 * distinguish "still loading" from "genuinely logged out".
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  preferred_language: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;                  // True once persisted state has been rehydrated
  setAuth: (token: string, user: User) => void;
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
      logout: () => set({ token: null, user: null }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'auth-storage',               // localStorage key
      onRehydrateStorage: () => (state) => {
        // Called once after the persisted state is loaded back.
        state?.setHasHydrated(true);
      },
    },
  ),
);
