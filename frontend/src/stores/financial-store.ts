import { create } from 'zustand';

type FinancialUiState = {
  selectedRange: string;
  setSelectedRange: (range: string) => void;
};

export const useFinancialStore = create<FinancialUiState>((set) => ({
  selectedRange: '30d',
  setSelectedRange: (selectedRange) => set({ selectedRange }),
}));
