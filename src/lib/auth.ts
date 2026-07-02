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
  satker_logo: string | null;
  role: RoleName | null;
}

/**
 * Ambil user + profil + role (Server Component / Server Action).
 *
 * Sesi sudah DIVALIDASI & di-refresh oleh middleware pada setiap request navigasi
 * terproteksi (middleware memanggil auth.getUser() lalu redirect ke /login bila
 * tidak sah). Karena itu di sini cukup MEMBACA sesi dari cookie via getSession()
 * — tanpa round-trip ke server Auth Supabase — sehingga perpindahan antar-halaman
 * lebih cepat. Keamanan data tetap ditegakkan oleh Row Level Security di database
 * (setiap query memakai token sesi yang sama).
 *
 * Dibungkus React cache(): bila layout + page (+ action) memanggilnya dalam satu
 * request render, kerjanya hanya SEKALI.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();

  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData?.session?.user ?? null;
  if (!authUser) return null;
  const userId = authUser.id;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('nama, jabatan, satker_id, roles(nama), master_satker(nama_satker, logo)')
    .eq('id', userId)
    .single();

  const satker = profile?.master_satker as { nama_satker?: string; logo?: string | null } | null;
  return {
    id: userId,
    email: authUser.email ?? null,
    nama: (profile?.nama as string) ?? authUser.email ?? null,
    jabatan: (profile?.jabatan as string) ?? null,
    satker_id: (profile?.satker_id as string) ?? null,
    satker_nama: satker?.nama_satker ?? null,
    satker_logo: satker?.logo ?? null,
    role: ((profile?.roles as { nama?: RoleName } | null)?.nama ?? null) as RoleName | null,
  };
});

/** Pakai di layout/halaman terlindungi: redirect ke /login bila belum masuk. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
