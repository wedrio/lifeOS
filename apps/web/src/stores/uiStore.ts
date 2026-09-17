import { create } from 'zustand';

export type AppTheme = 'light' | 'dark';
export type ParticleDensity = 'low' | 'normal' | 'high';

interface UIState {
  theme: AppTheme;
  mobileMenuOpen: boolean;
  particlesEnabled: boolean;
  particlesDensity: ParticleDensity;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setParticlesEnabled: (enabled: boolean) => void;
  setParticlesDensity: (density: ParticleDensity) => void;
}

const initialTheme = (): AppTheme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const initialParticlesEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('lifeos_particles_enabled') !== 'false';
};

const initialParticlesDensity = (): ParticleDensity => {
  if (typeof window === 'undefined') return 'normal';
  return (localStorage.getItem('lifeos_particles_density') as ParticleDensity) || 'normal';
};

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme(),
  mobileMenuOpen: false,
  particlesEnabled: initialParticlesEnabled(),
  particlesDensity: initialParticlesDensity(),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setParticlesEnabled: (enabled) => {
    localStorage.setItem('lifeos_particles_enabled', String(enabled));
    set({ particlesEnabled: enabled });
  },
  setParticlesDensity: (density) => {
    localStorage.setItem('lifeos_particles_density', density);
    set({ particlesDensity: density });
  },
}));
