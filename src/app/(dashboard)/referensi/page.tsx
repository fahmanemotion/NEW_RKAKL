import { createServerSupabase } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';
import { Card, Button } from '@/components/ui';
import { ReferensiTabs } from '@/components/referensi/tabs';
import { MASTERS, type MasterKey } from '@/lib/referensi';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const ORDER: MasterKey[] = ['program', 'kegiatan', 'kro', 'ro', 'komponen', 'sub_komponen', 'akun'];

async function countOf(table: string) {
  const supabase = await createServerSupabase();
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function ReferensiPage() {
  await requireUser();
  const counts = await Promise.all(ORDER.map((k) => countOf(MASTERS[k].table)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Referensi Kode</h1>
        <p className="text-sm text-muted-foreground">
          Master data kode RKA-KL untuk pilihan saat input penganggaran. Pilih master untuk mengelola (tambah/edit/hapus) atau impor Excel.
        </p>
      </div>

      <ReferensiTabs />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((k, i) => (
          <Card key={k} className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-muted-foreground">Master {MASTERS[k].label}</div>
              <div className="text-2xl font-bold tabular-nums">{counts[i]}</div>
            </div>
            <Link href={`/referensi/${k}`}>
              <Button variant="outline" size="sm">Kelola <ArrowRight className="size-4" /></Button>
            </Link>
          </Card>
        ))}
      </div>

      <Card className="border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="font-medium">Import Excel kini tersedia</p>
        <p className="mt-1 text-muted-foreground">
          Buka salah satu master di atas, lalu klik <strong>Import Excel</strong> untuk menambah banyak kode sekaligus —
          tidak perlu lewat SQL lagi. Duplikat diabaikan otomatis sehingga aman diimpor berulang.
        </p>
      </Card>
    </div>
  );
}
