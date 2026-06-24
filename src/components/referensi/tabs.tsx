'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Modul Referensi disederhanakan menjadi 3 menu.
const TABS: { key: string; label: string }[] = [
  { key: 'kode', label: 'KODE' },
  { key: 'akun', label: 'Akun' },
  { key: 'satker', label: 'Satker' },
  { key: 'tempat-tanggal', label: 'Tempat & Tgl' },
  { key: 'penandatangan', label: 'Penandatanganan' },
];

export function ReferensiTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((t) => {
        const href = `/referensi/${t.key}`;
        const active = pathname === href;
        return (
          <Link
            key={t.key}
            href={href}
            className={cn(
              'rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
