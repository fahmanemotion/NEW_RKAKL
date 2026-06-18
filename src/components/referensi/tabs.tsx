'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MASTERS, type MasterKey } from '@/lib/referensi';

const ORDER: MasterKey[] = ['program', 'kegiatan', 'kro', 'ro', 'komponen', 'sub_komponen', 'akun', 'penandatangan'];

export function ReferensiTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {ORDER.map((k) => {
        const href = `/referensi/${k}`;
        const active = pathname === href;
        return (
          <Link
            key={k}
            href={href}
            className={cn(
              'rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {MASTERS[k].label}
          </Link>
        );
      })}
    </div>
  );
}
