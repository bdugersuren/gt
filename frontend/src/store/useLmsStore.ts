import { create } from 'zustand';

interface LmsState {
  isOnline: boolean;
  syncing: boolean;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useLmsStore = create<LmsState>((set) => ({
  // Initialize connection state safely checking for browser window
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ syncing }),
}));
