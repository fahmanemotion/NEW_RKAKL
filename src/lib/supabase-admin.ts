// SIPPT — klien Supabase SERVICE-ROLE (khusus server / Server Actions).
// JANGAN PERNAH mengimpor file ini dari Client Component ("use client").
// Service role melewati RLS, jadi setiap pemanggil WAJIB memverifikasi otoritas
// (mis. requireAdmin) sebelum menjalankan operasi.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  if (!URL || !SERVICE_KEY) {
    throw new Error(
      "Konfigurasi server belum lengkap (SUPABASE_SERVICE_ROLE_KEY tidak ditemukan).",
    );
  }
  return createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
