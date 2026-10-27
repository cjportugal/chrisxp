import { create } from 'zustand';

interface TrashStore {
  /** Bumps every time someone empties the (always empty) Trash, so the icon can jiggle. */
  shakeToken: number;
  shake: () => void;
}

export const useTrashStore = create<TrashStore>((set) => ({
  shakeToken: 0,
  shake: () => set((state) => ({ shakeToken: state.shakeToken + 1 })),
}));
