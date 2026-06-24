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
 * Performa:
 *  - getClaims() memverifikasi JWT secara LOKAL (kunci asimetris + JWKS ter-cache)
 *    sehingga TIDAK ada round-trip jaringan ke server Auth pada tiap halaman —
 *    jauh lebih cepat daripada getUser(). (Bila proyek memakai kunci simetris,
 *    getClaims otomatis fallback memverifikasi via jaringan, tanpa regresi.)
 *  - Dibungkus React cache(): bila layout + page (+ action) memanggilnya dalam
 *    satu request render, kerjanya hanya dilakukan SEKALI.
 *
 * Catatan keamanan: getClaims memverifikasi tanda tangan & kedaluwarsa token,
 * aman untuk otorisasi halaman. (Pencabutan sesi sisi-server baru terdeteksi
 * saat token kedaluwarsa, ≤ 1 jam — dimitigasi auto-logout idle 5 menit.)
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = (claimsData?.claims ?? null) as
    | { sub?: string; email?: string }
    | null;
  const userId = claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('nama, jabatan, satker_id, roles(nama), master_satker(nama_satker)')
    .eq('id', userId)
    .single();

  return {
    id: userId,
    email: claims?.email ?? null,
    nama: (profile?.nama as string) ?? claims?.email ?? null,
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
