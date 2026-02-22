import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

type UiState = {
  sidebarCollapsed: boolean;
  theme: Theme;
  commandOpen: boolean;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setCommandOpen: (open: boolean) => void;
  hydrateTheme: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      theme: 'light',
      commandOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleTheme: () => {
        const nextTheme: Theme = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        set({ theme: nextTheme });
      },
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      hydrateTheme: () => {
        const theme = get().theme;
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },
    }),
    { name: 'gp-ui-store', partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, theme: state.theme }) },
  ),
);
