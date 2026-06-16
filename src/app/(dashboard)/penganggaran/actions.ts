'use server';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';

/** Buat usulan Draft baru dengan Program & Kegiatan pilihan pengguna. */
export async function createUsulanAction(input: {
  programId: string;
  kegiatanId: string;
  tahun: number;
}): Promise<string> {
  const user = await requireUser();
  if (!user.satker_id) throw new Error('Akun Anda belum memiliki satker. Hubungi Administrator.');
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
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
  return data!.id as string;
}
