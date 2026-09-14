import { create } from 'zustand';

export type AppTheme = 'light' | 'dark';

interface UIState {
  theme: AppTheme;
  mobileMenuOpen: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

const initialTheme = (): AppTheme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme(),
  mobileMenuOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
}));
