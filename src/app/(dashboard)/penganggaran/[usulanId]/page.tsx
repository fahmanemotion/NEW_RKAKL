import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { fetchStrukturServer } from './data';
import { PenganggaranClient, type UsulanHeader } from '@/components/grid/penganggaran-client';

export default async function Page({ params }: { params: Promise<{ usulanId: string }> }) {
  const { usulanId } = await params;
  const supabase = await createServerSupabase();

  const { data: u } = await supabase
    .from('usulan_anggaran')
    .select(`
      id, tahun_anggaran, status, kegiatan_id,
      satker:master_satker!satker_id ( kode_satker, nama_satker, kppn, lokus,
        unit:master_unit_eselon1!unit_id ( nama,
          kem:master_kementerian!kementerian_id ( nama,
            ba:master_ba!ba_id ( kode_ba, nama_ba ) ) ) ),
      program:master_program!program_id ( kode_program, nama_program ),
      kegiatan:master_kegiatan!kegiatan_id ( id, kode_kegiatan, nama_kegiatan )
    `)
    .eq('id', usulanId)
    .single();

  if (!u) notFound();

  // PostgREST mengembalikan relasi sebagai objek (atau array bila ambigu); rapikan.
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const satker: any = one((u as any).satker);
  const unit: any = one(satker?.unit);
  const kem: any = one(unit?.kem);
  const ba: any = one(kem?.ba);
  const program: any = one((u as any).program);
  const kegiatan: any = one((u as any).kegiatan);

  const header: UsulanHeader = {
    id: u.id as string,
    tahun_anggaran: u.tahun_anggaran as number,
    status: u.status as string,
    ba: ba ? `${ba.kode_ba} — ${ba.nama_ba}` : '022',
    kementerian: kem?.nama ?? '—',
    unit: unit?.nama ?? '—',
    satker: satker ? `${satker.kode_satker} — ${satker.nama_satker}` : '—',
    program_kode: program ? `${ba?.kode_ba ?? '022'}.${program.kode_program}` : '',
    program_nama: program?.nama_program ?? '',
    kegiatan_id: (u.kegiatan_id as string) ?? kegiatan?.id ?? null,
    kegiatan_kode: kegiatan?.kode_kegiatan ?? '',
    kegiatan_nama: kegiatan?.nama_kegiatan ?? '',
    kppn: satker?.kppn ? `${satker.kppn}-Makassar I` : '054-Makassar I',
    lokus: satker?.lokus ?? '19.51-KOTA MAKASSAR',
  };

  const rows = await fetchStrukturServer(usulanId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Penganggaran — RUH Belanja</h1>
        <p className="text-sm text-muted-foreground">
          Penyusunan usulan hierarkis ala SAKTI. TA {header.tahun_anggaran} · {header.satker}
        </p>
      </div>
      <PenganggaranClient header={header} initialRows={rows} />
    </div>
  );
}
