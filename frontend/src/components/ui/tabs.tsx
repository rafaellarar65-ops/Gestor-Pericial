import { cn } from '@/lib/utils';

type TabOption = {
  value: string;
  label: string;
};

type TabsProps = {
  tabs: string[] | TabOption[];
  activeTab: string;
  onChange: (tab: string) => void;
};

export const Tabs = ({ tabs, activeTab, onChange }: TabsProps) => {
  const options: TabOption[] = tabs.map((tab) =>
    typeof tab === 'string' ? { value: tab, label: tab } : tab,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tab) => (
        <button
          key={tab.value}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm',
            activeTab === tab.value ? 'bg-primary text-primary-foreground' : 'bg-background',
          )}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
