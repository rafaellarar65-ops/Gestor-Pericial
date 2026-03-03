import type { ReactNode } from 'react';

export type AppShellHeaderConfig = {
  primaryActions?: ReactNode;
  contextualAside?: ReactNode;
};

export type AppShellOutletContext = {
  setHeaderConfig: (config: AppShellHeaderConfig) => void;
  clearHeaderConfig: () => void;
};
