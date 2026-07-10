import { Suspense } from 'react';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';
import { Card, Badge } from '@/components/ui';
import { fmtRp, STATUS_COLOR, type Status } from '@/lib/constants';
import { TAHAP_LABEL, type TahapPagu } from '@/lib/tahap-pagu';
import { ChevronRight } from 'lucide-react';
import { NewUsulanButton } from '@/components/penganggaran/new-usulan-dialog';
import { DeleteUsulanButton } from '@/components/penganggaran/delete-usulan-button';
import { ListSkeleton } from '@/components/ui/skeleton';

// Streaming (#2): halaman TIDAK menunggu data. Rangka (judul + tombol Buat
// Usulan) dirender SEKETIKA; daftar usulan dibungkus <Suspense> sehingga mengalir
// masuk setelah query DB selesai — pengguna langsung melihat halaman "hidup".
export default function PenganggaranListPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Penganggaran</h1>
          <p className="text-sm text-muted-foreground">Daftar usulan anggaran satker Anda.</p>
        </div>
        <NewUsulanButton />
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <UsulanList />
      </Suspense>
    </div>
  );
}

async function UsulanList() {
  const user = await requireUser();
  const isAdmin = user.role === 'Administrator';
  const supabase = (await createServerSupabase()) as unknown as { from: (t: string) => any };
  // Satu query: daftar usulan sudah memuat tahap_pagu (tidak lagi query terpisah).
  const { data: list } = await supabase
    .from('usulan_anggaran')
    .select(`id, tahun_anggaran, status, total_anggaran, tahap_pagu,
      program:master_program!program_id(kode_program, nama_program),
      kegiatan:master_kegiatan!kegiatan_id(kode_kegiatan, nama_kegiatan)`)
    .order('created_at', { ascending: false });

  return (
    <Card className="divide-y divide-border">
      {(list ?? []).length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Belum ada usulan. Klik <span className="font-medium text-primary">Buat Usulan</span> untuk memulai.
        </div>
      ) : (list ?? []).map((u: any) => {
        const tahapLabel = TAHAP_LABEL[u.tahap_pagu as TahapPagu] ?? 'Usulan';
        const canDelete = isAdmin || u.status === 'Draft';
        return (
        <div key={u.id} className="flex items-center hover:bg-accent">
          <Link href={`/penganggaran/${u.id}`} className="flex flex-1 items-center gap-4 p-4">
            <div className="flex-1">
              <div className="font-medium">
                TA {u.tahun_anggaran} — {tahapLabel}
              </div>
              <div className="text-xs text-muted-foreground">
                {u.kegiatan?.nama_kegiatan
                  ? `${u.kegiatan.kode_kegiatan ?? ''} ${u.kegiatan.nama_kegiatan}`
                  : (u.program?.nama_program ?? '')}
              </div>
              <div className="text-sm text-muted-foreground tabular-nums">{fmtRp(u.total_anggaran)}</div>
            </div>
            <Badge className={STATUS_COLOR[u.status as Status]}>{u.status}</Badge>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <div className="px-3">
            <DeleteUsulanButton
              id={u.id}
              title={`TA ${u.tahun_anggaran} — ${tahapLabel}`}
              disabled={!canDelete}
              disabledReason="Hanya usulan Draft yang dapat dihapus"
            />
          </div>
        </div>
        );
      })}
    </Card>
  );
}
