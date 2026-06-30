'use client';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Jika false: sembunyikan tombol X, nonaktifkan ESC & klik-luar untuk tutup. */
  dismissable?: boolean;
}

/** Modal ringan tanpa dependensi Radix: overlay + ESC + klik luar untuk tutup. */
export function Modal({ open, onClose, title, children, footer, className, dismissable = true }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismissable) onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && dismissable) onClose(); }}
    >
      <div className={cn('my-[3vh] flex max-h-[94vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-xl sm:my-[6vh] sm:max-h-[88vh]', className)}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold">{title}</h2>
          {dismissable && (
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Tutup">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>
  );
}
