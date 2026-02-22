import { create } from 'zustand';

type AgendaUiState = {
  currentStep: number;
  setStep: (step: number) => void;
};

export const useAgendaStore = create<AgendaUiState>((set) => ({
  currentStep: 1,
  setStep: (currentStep) => set({ currentStep }),
}));
