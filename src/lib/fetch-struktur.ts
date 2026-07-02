import type { UsulanStruktur } from "@/types/database";

/**
 * Ambil SELURUH baris struktur satu usulan dengan PAGINASI.
 *
 * PostgREST (Supabase) membatasi maksimal 1000 baris per permintaan. Usulan
 * besar (>1000 node — mis. hasil impor Kertas Kerja) akan TERPOTONG diam-diam
 * tanpa paginasi, sehingga sebagian Program/KRO/Komponen/Detail "hilang" dari
 * tampilan walau datanya ada di database.
 *
 * `sb` menerima instance Supabase client apa pun (browser/server/admin).
 * Urutan paginasi memakai (urutan, id) agar STABIL — banyak baris berbagi
 * nilai `urutan`, jadi `id` dipakai sebagai pemecah seri agar tidak ada baris
 * yang terlewat atau ganda antar halaman.
 */
export async function fetchAllStruktur(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: { from: (t: string) => any },
  usulanId: string,
  columns: string = "*",
): Promise<UsulanStruktur[]> {
  const PAGE = 1000;
  let from = 0;
  const all: UsulanStruktur[] = [];
  for (;;) {
    const { data, error } = await sb
      .from("usulan_struktur")
      .select(columns)
      .eq("usulan_id", usulanId)
      .order("urutan", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as UsulanStruktur[];
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
