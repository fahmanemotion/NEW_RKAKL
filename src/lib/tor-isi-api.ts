// SIPPT — muat & simpan isi TOR per komponen: narasi bagian, matriks tahapan,
// dan pilihan sumber dana (RM/BLU). Dipakai oleh form editor isi TOR.
import { createClient } from "@/lib/supabase";
import { TOR_SECTIONS } from "./tor-ai-sections";

export interface TorTahapanRow {
  nama: string;
  bulan_mulai: number;
  bulan_selesai: number;
}

export interface TorIsi {
  narasi: Record<string, string>; // section_id -> teks
  tahapan: TorTahapanRow[];
  sumberDana: string; // 'RM' | 'BLU'
}

/** Tahapan awal saat komponen belum pernah diisi (bisa diubah pengguna). */
export const DEFAULT_TAHAPAN: TorTahapanRow[] = [
  { nama: "Persiapan", bulan_mulai: 1, bulan_selesai: 2 },
  { nama: "Pelaksanaan", bulan_mulai: 3, bulan_selesai: 5 },
  { nama: "Evaluasi dan Pelaporan", bulan_mulai: 6, bulan_selesai: 6 },
];

// Tabel tor_* belum ada di tipe Database bawaan → pakai klien longgar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (): any => createClient();

/** Muat isi TOR tersimpan untuk satu komponen. */
export async function loadTorIsi(usulanId: string, komponenId: string): Promise<TorIsi> {
  const [{ data: n }, { data: t }, { data: o }] = await Promise.all([
    sb().from("tor_narasi").select("section_id, teks").eq("usulan_id", usulanId).eq("komponen_id", komponenId),
    sb()
      .from("tor_tahapan")
      .select("nama, urutan, bulan_mulai, bulan_selesai")
      .eq("usulan_id", usulanId)
      .eq("komponen_id", komponenId)
      .order("urutan"),
    sb()
      .from("tor_komponen_opsi")
      .select("sumber_dana")
      .eq("usulan_id", usulanId)
      .eq("komponen_id", komponenId)
      .maybeSingle(),
  ]);
  const narasi: Record<string, string> = {};
  for (const r of (n ?? []) as { section_id: string; teks: string }[]) narasi[r.section_id] = r.teks ?? "";
  const tahapan = ((t ?? []) as TorTahapanRow[]).map((r) => ({
    nama: r.nama,
    bulan_mulai: Number(r.bulan_mulai) || 1,
    bulan_selesai: Number(r.bulan_selesai) || 1,
  }));
  return {
    narasi,
    tahapan: tahapan.length ? tahapan : DEFAULT_TAHAPAN.map((x) => ({ ...x })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sumberDana: ((o as any)?.sumber_dana as string) || "RM",
  };
}

/** Simpan isi TOR untuk satu komponen (ganti-total agar tidak ada sisa data lama). */
export async function saveTorIsi(usulanId: string, komponenId: string, isi: TorIsi): Promise<void> {
  const c = sb();
  const key = { usulan_id: usulanId, komponen_id: komponenId };

  // 1) Narasi: hapus lama, sisipkan yang terisi.
  const delN = await c.from("tor_narasi").delete().match(key);
  if (delN.error) throw delN.error;
  const narasiRows = TOR_SECTIONS.map((s) => ({
    ...key,
    section_id: s.id,
    teks: (isi.narasi[s.id] ?? "").trim(),
  })).filter((r) => r.teks.length > 0);
  if (narasiRows.length) {
    const insN = await c.from("tor_narasi").insert(narasiRows);
    if (insN.error) throw insN.error;
  }

  // 2) Tahapan matriks: hapus lama, sisipkan urut.
  const delT = await c.from("tor_tahapan").delete().match(key);
  if (delT.error) throw delT.error;
  const tahapanRows = isi.tahapan
    .filter((t) => t.nama.trim())
    .map((t, i) => ({
      ...key,
      nama: t.nama.trim(),
      urutan: i,
      bulan_mulai: clampBulan(t.bulan_mulai),
      bulan_selesai: clampBulan(Math.max(t.bulan_selesai, t.bulan_mulai)),
    }));
  if (tahapanRows.length) {
    const insT = await c.from("tor_tahapan").insert(tahapanRows);
    if (insT.error) throw insT.error;
  }

  // 3) Opsi sumber dana: upsert.
  const upO = await c
    .from("tor_komponen_opsi")
    .upsert({ ...key, sumber_dana: isi.sumberDana === "BLU" ? "BLU" : "RM" }, { onConflict: "usulan_id,komponen_id" });
  if (upO.error) throw upO.error;
}

function clampBulan(n: number): number {
  const v = Math.round(Number(n) || 1);
  return Math.min(12, Math.max(1, v));
}
