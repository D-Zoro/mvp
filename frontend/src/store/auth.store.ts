import { create } from "zustand";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import type { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user), isLoading: false }),
  logout: async () => {
    await apiClient.post(API.auth.logout).catch(() => undefined);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  refreshUser: async () => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.get<User>(API.auth.me);
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
