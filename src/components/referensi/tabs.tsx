'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Modul Referensi disederhanakan menjadi beberapa menu.
const TABS: { key: string; label: string }[] = [
  { key: 'kode', label: 'KODE KK' },
  { key: 'kode-tor', label: 'KODE TOR' },
  { key: 'akun', label: 'Akun' },
  { key: 'satker', label: 'Satker' },
  { key: 'tempat-tanggal', label: 'Tempat & Tgl' },
  { key: 'penandatangan', label: 'Penandatanganan' },
  { key: 'backup', label: 'Backup' },
];

export function ReferensiTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((t) => {
        const href = `/referensi/${t.key}`;
        const active = pathname === href;
        return (
          <Link
            key={t.key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
