import { create } from 'zustand';

type PericiaUiState = {
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
};

export const usePericiaStore = create<PericiaUiState>((set) => ({
  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
}));
