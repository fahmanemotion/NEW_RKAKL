// SIPPT — klien Supabase untuk SERVER (Server Components, Server Actions,
// Route Handlers). Mengimpor next/headers, jadi HANYA boleh dipakai di server.
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component tanpa akses set-cookie → diabaikan
          // (refresh sesi ditangani middleware.ts).
        }
      },
    },
  });
}
