'use server';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';

/**
 * Buat usulan Draft + seed node PROGRAM & KEGIATAN awal ke dalam pohon
 * (boleh ditambah Program/Kegiatan lain dari dalam grid). Kembalikan id usulan.
 */
export async function createUsulanAction(input: {
  programId: string;
  kegiatanId: string;
  tahun: number;
}): Promise<string> {
  const user = await requireUser();
  if (!user.satker_id) throw new Error('Akun Anda belum memiliki satker. Hubungi Administrator.');
  const supabase = await createServerSupabase();

  const [{ data: prog }, { data: keg }, { data: ba }] = await Promise.all([
    supabase.from('master_program').select('kode_program, nama_program').eq('id', input.programId).single(),
    supabase.from('master_kegiatan').select('kode_kegiatan, nama_kegiatan').eq('id', input.kegiatanId).single(),
    supabase.from('master_ba').select('kode_ba').limit(1).single(),
  ]);

  const { data: usulan, error } = await supabase
    .from('usulan_anggaran')
    .insert({
      tahun_anggaran: input.tahun,
      satker_id: user.satker_id,
      program_id: input.programId,
      kegiatan_id: input.kegiatanId,
      status: 'Draft',
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const usulanId = usulan!.id as string;

  // Seed node PROGRAM (akar) lalu KEGIATAN di bawahnya.
  const kodeBa = (ba?.kode_ba as string) ?? '022';
  const { data: progNode, error: e1 } = await supabase
    .from('usulan_struktur')
    .insert({
      usulan_id: usulanId, parent_id: null, level: 'PROGRAM',
      referensi_id: input.programId,
      kode: `${kodeBa}.${prog?.kode_program ?? ''}`,
      uraian: prog?.nama_program ?? '', urutan: 0,
    })
    .select('id')
    .single();
  if (e1) throw new Error(e1.message);

  const { error: e2 } = await supabase.from('usulan_struktur').insert({
    usulan_id: usulanId, parent_id: progNode!.id, level: 'KEGIATAN',
    referensi_id: input.kegiatanId,
    kode: keg?.kode_kegiatan ?? '', uraian: keg?.nama_kegiatan ?? '', urutan: 0,
  });
  if (e2) throw new Error(e2.message);

  return usulanId;
}
