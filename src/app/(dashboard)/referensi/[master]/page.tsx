import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Database } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { MASTERS, type MasterKey } from '@/lib/referensi';
import { ReferensiTabs } from '@/components/referensi/tabs';
import { MasterManager } from '@/components/referensi/master-manager';
import { KodeManager } from '@/components/referensi/kode-manager';
import { TorKodeManager } from '@/components/referensi/tor-kode-manager';
import { PenandatanganManager } from '@/components/referensi/penandatangan-manager';
import { TempatTanggalManager } from '@/components/referensi/tempat-tanggal-manager';
import { SatkerManager } from '@/components/referensi/satker-manager';

/** Shell konsisten untuk semua sub-halaman Referensi: hero + tab + konten. */
function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border card-elevated bg-gradient-to-br from-[hsl(214_92%_46%)] via-[hsl(206_92%_40%)] to-[hsl(217_56%_24%)] text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="relative flex items-start gap-3 p-5 sm:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/20">
            <Database className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Data Referensi
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-white/85">{subtitle}</p>
          </div>
        </div>
      </div>
      <ReferensiTabs />
      {children}
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ master: string }> }) {
  const user = await requireUser();
  const { master } = await params;

  // Menu "KODE" = importer gabungan (BA→Komponen), bukan master tunggal.
  if (master === 'kode') {
    return (
      <Shell
        title="Referensi KODE KK"
        subtitle="Kode Kertas Kerja. Tambah / perbarui seluruh kode sekaligus (BA, Program, Kegiatan, KRO, RO, Komponen) dari satu file Excel."
      >
        <KodeManager />
      </Shell>
    );
  }

  // Menu "KODE TOR" = master metadata kinerja per komponen untuk generator TOR.
  if (master === 'kode-tor') {
    return (
      <Shell
        title="Referensi KODE TOR"
        subtitle="Metadata kinerja per komponen (Sasaran & Indikator Program/Kegiatan, Unit Eselon) untuk mengisi tabel identitas TOR yang tidak otomatis."
      >
        <TorKodeManager />
      </Shell>
    );
  }

  // Menu "Satker" = ubah identitas satker yang sedang memakai aplikasi (nama dll).
  if (master === 'satker') {
    return (
      <Shell
        title="Referensi Satker"
        subtitle="Ubah identitas satker. Perubahan nama langsung berlaku di seluruh aplikasi dan pada laporan RAB."
      >
        <SatkerManager satkerId={user.satker_id} />
      </Shell>
    );
  }

  // Menu "Tempat & Tgl" = pengaturan tempat (kota) & tanggal yang dicetak di RAB.
  if (master === 'tempat-tanggal') {
    return (
      <Shell
        title="Referensi Tempat & Tanggal"
        subtitle="Atur tempat (kota) & tanggal yang dicetak pada laporan RAB."
      >
        <TempatTanggalManager />
      </Shell>
    );
  }

  // Menu "Penandatanganan" = daftar pejabat penanda tangan (dipilih saat buat laporan).
  if (master === 'penandatangan') {
    return (
      <Shell
        title="Referensi Penandatanganan"
        subtitle="Kelola daftar pejabat penanda tangan untuk laporan RAB."
      >
        <PenandatanganManager />
      </Shell>
    );
  }

  if (!(master in MASTERS)) notFound();
  const def = MASTERS[master as MasterKey];

  return (
    <Shell
      title="Referensi Kode"
      subtitle={
        <>
          Kelola master <span className="font-medium text-white">{def.label}</span> — tambah,
          ubah, hapus, atau impor dari Excel.
        </>
      }
    >
      <MasterManager masterKey={master as MasterKey} />
    </Shell>
  );
}
