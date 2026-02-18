import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, UserRole } from '@/types';
import { tokenManager } from '@/lib/api/client';

// ─────────────────────────────────────────
// Auth Store Interface
// ─────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  hasRole: (roles: UserRole[]) => boolean;
}

// ─────────────────────────────────────────
// Auth Store Implementation
// ─────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: (token: string, user: AuthUser) => {
        tokenManager.set(token);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        tokenManager.remove();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setUser: (user: AuthUser) => {
        set({ user });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user profile — NOT isAuthenticated.
      // WHY: The access token lives in memory only. After a page reload,
      // the token is gone. isAuthenticated=true without a token would let
      // the UI think the user is logged in but all API calls would fail with 401.
      // The token refresh flow (POST /auth/refresh using the httpOnly cookie)
      // is responsible for re-establishing the session after reload.
      partialize: (state) => ({
        user: state.user,
        // isAuthenticated is intentionally excluded — always false on reload
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration: user profile may be present but token is gone.
        // Force isAuthenticated=false so the app triggers the refresh flow.
        if (state) {
          state.isAuthenticated = false;
          state.isLoading = false;
        }
      },
    }
  )
);

// ─────────────────────────────────────────
// UI Store Interface
// ─────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
}

// ─────────────────────────────────────────
// UI Store Implementation
// ─────────────────────────────────────────

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      toggleSidebarCollapse: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: 'ui-storage',
    }
  )
);
