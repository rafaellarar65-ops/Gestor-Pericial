import { create } from 'zustand';

type ConfigUiState = {
  locale: 'pt-BR';
};

export const useConfigStore = create<ConfigUiState>(() => ({ locale: 'pt-BR' }));
