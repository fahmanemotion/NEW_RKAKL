import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createServerSupabase } from '@/lib/supabase-server';
import type { RoleName } from '@/lib/constants';

export interface CurrentUser {
  id: string;
  email: string | null;
  nama: string | null;
  jabatan: string | null;
  satker_id: string | null;
  satker_nama: string | null;
  role: RoleName | null;
}

/**
 * Ambil user + profil + role (Server Component / Server Action).
 *
 * Memakai getUser() — memvalidasi sesi ke server Auth Supabase. Refresh token
 * yang andal ditangani middleware (satu-satunya tempat cookie bisa ditulis),
 * sehingga halaman tinggal membaca sesi yang sudah segar tanpa balapan refresh.
 * Dibungkus React cache(): bila layout + page (+ action) memanggilnya dalam satu
 * request render, kerjanya hanya SEKALI.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();

  const { data: userData, error } = await supabase.auth.getUser();
  const authUser = userData?.user;
  if (error || !authUser) return null;
  const userId = authUser.id;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('nama, jabatan, satker_id, roles(nama), master_satker(nama_satker)')
    .eq('id', userId)
    .single();

  return {
    id: userId,
    email: authUser.email ?? null,
    nama: (profile?.nama as string) ?? authUser.email ?? null,
    jabatan: (profile?.jabatan as string) ?? null,
    satker_id: (profile?.satker_id as string) ?? null,
    satker_nama: (profile?.master_satker as { nama_satker?: string } | null)?.nama_satker ?? null,
    role: ((profile?.roles as { nama?: RoleName } | null)?.nama ?? null) as RoleName | null,
  };
});

/** Pakai di layout/halaman terlindungi: redirect ke /login bila belum masuk. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
