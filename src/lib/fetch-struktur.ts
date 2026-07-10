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
  // Satu halaman [from..from+PAGE-1], terurut stabil (urutan, id).
  const page = (from: number, withCount: boolean) =>
    sb
      .from("usulan_struktur")
      .select(columns, withCount ? { count: "exact" } : undefined)
      .eq("usulan_id", usulanId)
      .order("urutan", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

  // Halaman pertama SEKALIGUS ambil COUNT total. Bila ada sisa halaman, semuanya
  // diambil PARALEL (bukan beruntun) — memangkas refresh usulan besar dari N
  // round-trip berantai menjadi 1 + paralel, sehingga tiap aksi terasa cepat.
  const first = await page(0, true);
  if (first.error) throw first.error;
  const firstBatch = (first.data ?? []) as UsulanStruktur[];
  if (firstBatch.length < PAGE) return firstBatch; // cukup satu halaman

  const total: number | null = first.count ?? null;
  if (total != null) {
    const rest = [];
    for (let from = PAGE; from < total; from += PAGE) rest.push(page(from, false));
    const results = await Promise.all(rest);
    const all = [...firstBatch];
    for (const r of results) {
      if (r.error) throw r.error;
      all.push(...((r.data ?? []) as UsulanStruktur[]));
    }
    return all;
  }

  // Fallback aman bila COUNT tak tersedia: paginasi beruntun (perilaku lama).
  const all = [...firstBatch];
  let from = PAGE;
  for (;;) {
    const { data, error } = await page(from, false);
    if (error) throw error;
    const batch = (data ?? []) as UsulanStruktur[];
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
