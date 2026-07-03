// SIPPT — pengambilan LOGO SATKER (base64), DIPISAH dari query profil.
//
// Logo disimpan sebagai data URL (base64) yang cukup besar dan JARANG berubah.
// Kalau ikut di query profil (getCurrentUser) yang jalan tiap navigasi halaman,
// base64 itu ditransfer dari DB ke server berulang-ulang sia-sia. Karena itu:
//   1) getCurrentUser TIDAK lagi mengambil kolom logo (query tiap navigasi jadi
//      kecil & cepat), dan
//   2) logo diambil di sini, HANYA dipanggil dari layout (dashboard). Layout
//      dashboard dirender SEKALI saat pengguna masuk area dashboard dan tetap
//      dipertahankan saat berpindah antar-modul (partial rendering App Router),
//      sehingga logo cukup dibaca sekali per sesi — bukan tiap pindah halaman.
//
// Dibungkus React cache() untuk dedup dalam satu render. Saat logo diganti,
// satker-manager memanggil router.refresh() yang me-render ulang layout →
// getSatkerLogo terpanggil lagi → logo baru langsung tampil (tanpa perlu
// invalidasi cache lintas-request).
import "server-only";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Logo satker (data URL) untuk topnav. Dibaca lewat RLS — pengguna hanya bisa
 * melihat satker miliknya (sama seperti join master_satker di getCurrentUser).
 */
export const getSatkerLogo = cache(
  async (satkerId: string | null): Promise<string | null> => {
    if (!satkerId) return null;
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("master_satker")
      .select("logo")
      .eq("id", satkerId)
      .maybeSingle();
    return (data as { logo?: string | null } | null)?.logo ?? null;
  },
);

/**
 * Dipertahankan demi kompatibilitas pemanggil (logo-actions → satker-manager).
 * Tidak ada cache lintas-request yang perlu dibuang: kesegaran logo setelah
 * diubah ditangani oleh router.refresh() yang me-render ulang layout. Jadi ini
 * sengaja no-op (aman dipanggil, tidak melakukan apa pun).
 */
export async function invalidateSatkerLogo(_satkerId: string): Promise<void> {
  void _satkerId;
}
