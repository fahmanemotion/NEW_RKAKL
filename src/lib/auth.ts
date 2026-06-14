import { redirect } from 'next/navigation';
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

/** Ambil user + profil + role (Server Component / Server Action). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('nama, jabatan, satker_id, roles(nama), master_satker(nama_satker)')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    nama: (profile?.nama as string) ?? user.email ?? null,
    jabatan: (profile?.jabatan as string) ?? null,
    satker_id: (profile?.satker_id as string) ?? null,
    satker_nama: (profile?.master_satker as { nama_satker?: string } | null)?.nama_satker ?? null,
    role: ((profile?.roles as { nama?: RoleName } | null)?.nama ?? null) as RoleName | null,
  };
}

/** Pakai di layout terlindungi: redirect ke /login bila belum masuk. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
