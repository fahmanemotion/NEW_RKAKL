import { createServerSupabase } from '@/lib/supabase-server';
import type { UsulanStruktur } from '@/types/database';

export async function fetchStrukturServer(usulanId: string): Promise<UsulanStruktur[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('usulan_struktur')
    .select('*')
    .eq('usulan_id', usulanId)
    .order('urutan', { ascending: true });
  return (data ?? []) as UsulanStruktur[];
}
