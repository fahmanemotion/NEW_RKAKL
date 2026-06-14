// SIPPT — klien Supabase untuk BROWSER (Client Components, "use client").
// File ini TIDAK boleh mengimpor next/headers agar aman dibundel ke klien.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Dipanggil dari Client Components. */
export function createClient() {
  return createBrowserClient<Database>(URL, ANON);
}
