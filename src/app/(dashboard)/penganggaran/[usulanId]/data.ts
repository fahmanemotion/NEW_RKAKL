import { createServerSupabase } from "@/lib/supabase-server";
import { fetchAllStruktur } from "@/lib/fetch-struktur";
import type { UsulanStruktur } from "@/types/database";

export async function fetchStrukturServer(
  usulanId: string,
): Promise<UsulanStruktur[]> {
  const supabase = await createServerSupabase();
  return fetchAllStruktur(supabase, usulanId);
}
