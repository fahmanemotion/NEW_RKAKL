// SIPPT — klien Supabase untuk BROWSER (Client Components, "use client").
// File ini TIDAK boleh mengimpor next/headers agar aman dibundel ke klien.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Dipanggil dari Client Components.
 *
 * Balikan dianotasi `SupabaseClient<Database>` dari `@supabase/supabase-js`
 * agar query builder memakai resolusi tipe modern (Row/Insert/Update nyata).
 * Tanpa ini, tipe generic dari versi `@supabase/ssr` yang lebih lama tidak
 * selaras dengan `@supabase/supabase-js` terbaru sehingga hasil query jadi
 * `never`. Cast via `unknown` aman: secara runtime ini instance yang sama.
 */
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(URL, ANON) as unknown as SupabaseClient<Database>;
}
