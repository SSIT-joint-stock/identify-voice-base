import { create } from 'zustand';

interface AppState {
  isLoading: boolean;
  setLoading: (value: boolean) => void;
}

/**
 * Global app state store (lightweight global status via Zustand).
 * Domain-specific stores should be created in their own files.
 */
export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setLoading: (value) => set({ isLoading: value }),
}));
