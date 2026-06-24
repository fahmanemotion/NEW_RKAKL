import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { MASTERS, type MasterKey } from '@/lib/referensi';
import { ReferensiTabs } from '@/components/referensi/tabs';
import { MasterManager } from '@/components/referensi/master-manager';
import { KodeManager } from '@/components/referensi/kode-manager';
import { PenandatanganManager } from '@/components/referensi/penandatangan-manager';
import { TempatTanggalManager } from '@/components/referensi/tempat-tanggal-manager';
import { SatkerManager } from '@/components/referensi/satker-manager';

export default async function Page({ params }: { params: Promise<{ master: string }> }) {
  const user = await requireUser();
  const { master } = await params;

  // Menu "KODE" = importer gabungan (BA→Komponen), bukan master tunggal.
  if (master === 'kode') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Referensi Kode</h1>
          <p className="text-sm text-muted-foreground">
            Tambah / perbarui seluruh kode sekaligus (BA, Program, Kegiatan, KRO, RO, Komponen) dari satu file Excel.
          </p>
        </div>
        <ReferensiTabs />
        <KodeManager />
      </div>
    );
  }

  // Menu "Satker" = ubah identitas satker yang sedang memakai aplikasi (nama dll).
  if (master === 'satker') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Referensi Satker</h1>
          <p className="text-sm text-muted-foreground">
            Ubah identitas satker. Perubahan nama langsung berlaku di seluruh aplikasi dan pada laporan RAB.
          </p>
        </div>
        <ReferensiTabs />
        <SatkerManager satkerId={user.satker_id} />
      </div>
    );
  }

  // Menu "Tempat & Tgl" = pengaturan tempat (kota) & tanggal yang dicetak di RAB.
  if (master === 'tempat-tanggal') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Referensi Tempat &amp; Tanggal</h1>
          <p className="text-sm text-muted-foreground">
            Atur tempat (kota) &amp; tanggal yang dicetak pada laporan RAB.
          </p>
        </div>
        <ReferensiTabs />
        <TempatTanggalManager />
      </div>
    );
  }

  // Menu "Penandatanganan" = daftar pejabat penanda tangan (dipilih saat buat laporan).
  if (master === 'penandatangan') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Referensi Penandatanganan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar pejabat penanda tangan untuk laporan RAB.
          </p>
        </div>
        <ReferensiTabs />
        <PenandatanganManager />
      </div>
    );
  }

  if (!(master in MASTERS)) notFound();
  const def = MASTERS[master as MasterKey];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Referensi Kode</h1>
        <p className="text-sm text-muted-foreground">
          Kelola master <span className="font-medium">{def.label}</span> — tambah, ubah, hapus, atau impor dari Excel.
        </p>
      </div>
      <ReferensiTabs />
      <MasterManager masterKey={master as MasterKey} />
    </div>
  );
}
