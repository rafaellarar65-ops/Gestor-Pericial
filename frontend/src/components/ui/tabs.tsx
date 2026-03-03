import { cn } from '@/lib/utils';

type TabsProps = {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
};

export const Tabs = ({ tabs, activeTab, onChange }: TabsProps) => (
  <div className="flex flex-wrap gap-2">
    {tabs.map((tab) => (
      <button
        key={tab}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm',
          activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-background',
        )}
        onClick={() => onChange(tab)}
      >
        {tab}
      </button>
    ))}
  </div>
);
