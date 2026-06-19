import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { MASTERS, type MasterKey } from '@/lib/referensi';
import { ReferensiTabs } from '@/components/referensi/tabs';
import { MasterManager } from '@/components/referensi/master-manager';
import { KodeManager } from '@/components/referensi/kode-manager';

export default async function Page({ params }: { params: Promise<{ master: string }> }) {
  await requireUser();
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
