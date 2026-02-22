export type SidebarItem = {
  label: string;
  href: string;
  permission?: 'ADMIN' | 'ASSISTANT';
  children?: SidebarItem[];
};

export const sidebarConfig: SidebarItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Perícias', href: '/pericias' },
  { label: 'Financeiro', href: '/financeiro' },
  { label: 'Agendar em Lote', href: '/agendar' },
];
