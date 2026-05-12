import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { User } from "@/lib/api/types";
import { clearAuthTokens, getAccessToken, setAuthTokens } from "@/lib/auth/tokenStorage";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: getAccessToken(),
      refreshToken: null,
      isAuthenticated: Boolean(getAccessToken()),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(state.accessToken && user),
        })),
      setTokens: ({ accessToken, refreshToken }) => {
        setAuthTokens({ accessToken, refreshToken });
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      clearAuth: () => {
        clearAuthTokens();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "books4all-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
