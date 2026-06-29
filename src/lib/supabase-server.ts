// SIPPT — klien Supabase untuk SERVER (Server Components, Server Actions,
// Route Handlers). Mengimpor next/headers, jadi HANYA boleh dipakai di server.
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Lihat catatan di supabase.ts soal anotasi SupabaseClient<Database>.
export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  return createServerClient<Database>(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: CookieToSet[]) {
        try {
          toSet.forEach(({ name, value, options }: CookieToSet) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component tanpa akses set-cookie → diabaikan
          // (refresh sesi ditangani middleware.ts).
        }
      },
    },
  }) as unknown as SupabaseClient<Database>;
}
