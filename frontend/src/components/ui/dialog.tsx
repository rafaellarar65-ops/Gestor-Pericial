import { useEffect, type PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  className?: string;
};

export const Dialog = ({ open, onClose, title, className, children }: PropsWithChildren<DialogProps>) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};
