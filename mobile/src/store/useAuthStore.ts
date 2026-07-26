import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '../lib/storage';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;
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
      name: 'auth',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        // Fires once persisted state has been read back from SecureStore,
        // regardless of whether a session existed. Without this, there's
        // no way to distinguish "still loading" from "genuinely logged out".
        state?.setHasHydrated(true);
      },
    }
  )
);

// Convenience selector for call sites that just need a boolean.
export const useIsAuthenticated = () =>
  useAuthStore((s) => s.hasHydrated && !!s.token && !!s.user);