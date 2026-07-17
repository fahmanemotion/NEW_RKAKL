// SIPPT — muat & simpan isi TOR per komponen: narasi bagian, matriks tahapan,
// dan pilihan sumber dana (RM/BLU). Dipakai oleh form editor isi TOR.
import { createClient } from "@/lib/supabase";
import { TOR_SECTIONS } from "./tor-ai-sections";
import { normKomp } from "./tor-data";

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

/* ── Template isi TOR (dapat dipakai ulang lintas usulan/tahun) ────────────────
 * Isi TOR disimpan ber-KUNCI NAMA KOMPONEN (dinormalisasi via normKomp — kunci
 * yang SAMA dipakai pencocokan KODE TOR), sehingga usulan lain yang komponennya
 * bernama sama dapat memuat kembali narasi yang sudah pernah dibuat.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Simpan SELURUH isi TOR usulan ini sebagai template (per komponen berisi).
 *  Membaca narasi/tahapan/opsi tersimpan usulan, lalu upsert ber-kunci nama. */
export async function saveTorTemplateForUsulan(
  usulanId: string,
  komponen: { id: string; uraian: string }[],
): Promise<{ saved: number }> {
  const c = sb();
  const [{ data: n }, { data: t }, { data: o }] = await Promise.all([
    c.from("tor_narasi").select("komponen_id, section_id, teks").eq("usulan_id", usulanId),
    c.from("tor_tahapan").select("komponen_id, nama, urutan, bulan_mulai, bulan_selesai").eq("usulan_id", usulanId).order("urutan"),
    c.from("tor_komponen_opsi").select("komponen_id, sumber_dana").eq("usulan_id", usulanId),
  ]);

  const narasiByKomp = new Map<string, Record<string, string>>();
  for (const r of (n ?? []) as { komponen_id: string; section_id: string; teks: string }[]) {
    if (!(r.teks && r.teks.trim())) continue;
    const m = narasiByKomp.get(r.komponen_id) ?? {};
    m[r.section_id] = r.teks;
    narasiByKomp.set(r.komponen_id, m);
  }
  const tahapanByKomp = new Map<string, TorTahapanRow[]>();
  for (const r of (t ?? []) as (TorTahapanRow & { komponen_id: string })[]) {
    const arr = tahapanByKomp.get(r.komponen_id) ?? [];
    arr.push({ nama: r.nama, bulan_mulai: Number(r.bulan_mulai) || 1, bulan_selesai: Number(r.bulan_selesai) || 1 });
    tahapanByKomp.set(r.komponen_id, arr);
  }
  const opsiByKomp = new Map<string, string>();
  for (const r of (o ?? []) as { komponen_id: string; sumber_dana: string }[]) opsiByKomp.set(r.komponen_id, r.sumber_dana || "RM");

  const rows: { komponen_key: string; komponen_nama: string; data: TorIsi; updated_at: string }[] = [];
  const seen = new Set<string>();
  const now = new Date().toISOString();
  for (const k of komponen) {
    const narasi = narasiByKomp.get(k.id);
    if (!narasi || Object.keys(narasi).length === 0) continue; // hanya komponen BERISI
    const key = normKomp(k.uraian);
    if (!key || seen.has(key)) continue; // dedup kunci dalam satu batch upsert
    seen.add(key);
    rows.push({
      komponen_key: key,
      komponen_nama: k.uraian,
      data: {
        narasi,
        tahapan: tahapanByKomp.get(k.id) ?? [],
        sumberDana: opsiByKomp.get(k.id) === "BLU" ? "BLU" : "RM",
      },
      updated_at: now,
    });
  }
  if (rows.length) {
    const { error } = await c.from("tor_isi_template").upsert(rows, { onConflict: "komponen_key" });
    if (error) throw error;
  }
  return { saved: rows.length };
}

/** Muat template isi TOR untuk sebuah nama komponen (null bila belum ada). */
export async function loadTorTemplate(komponenNama: string): Promise<TorIsi | null> {
  const key = normKomp(komponenNama);
  if (!key) return null;
  const { data } = await sb().from("tor_isi_template").select("data").eq("komponen_key", key).maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = ((data as any).data ?? {}) as Partial<TorIsi>;
  const tahapan = (d.tahapan ?? []) as TorTahapanRow[];
  return {
    narasi: d.narasi ?? {},
    tahapan: tahapan.length ? tahapan : DEFAULT_TAHAPAN.map((x) => ({ ...x })),
    sumberDana: d.sumberDana === "BLU" ? "BLU" : "RM",
  };
}

/** Himpunan kunci komponen yang punya template (untuk penanda di daftar). */
export async function listTorTemplateKeys(): Promise<Set<string>> {
  const { data } = await sb().from("tor_isi_template").select("komponen_key");
  return new Set(((data ?? []) as { komponen_key: string }[]).map((r) => r.komponen_key));
}

/* ── Pengelolaan pustaka template (Referensi → NARASI TOR) ─────────────────── */

export interface TorTemplateRow {
  komponen_key: string;
  komponen_nama: string;
  isi: TorIsi;
  updated_at: string;
}

/** Bentuk ulang jsonb `data` menjadi TorIsi yang utuh (tahan data lama/kosong). */
function toTorIsi(raw: unknown): TorIsi {
  const d = (raw ?? {}) as Partial<TorIsi>;
  return {
    narasi: d.narasi ?? {},
    tahapan: (d.tahapan ?? []) as TorTahapanRow[],
    sumberDana: d.sumberDana === "BLU" ? "BLU" : "RM",
  };
}

/** Daftar seluruh template isi TOR, urut nama komponen. */
export async function listTorTemplates(): Promise<TorTemplateRow[]> {
  const { data, error } = await sb()
    .from("tor_isi_template")
    .select("komponen_key, komponen_nama, data, updated_at")
    .order("komponen_nama");
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    komponen_key: String(r.komponen_key),
    komponen_nama: String(r.komponen_nama ?? ""),
    isi: toTorIsi(r.data),
    updated_at: String(r.updated_at ?? ""),
  }));
}

/**
 * Simpan/perbarui satu template ber-kunci NAMA komponen (dinormalisasi).
 * Nama yang menghasilkan kunci sama dianggap komponen yang sama → tidak digandakan.
 */
export async function saveTorTemplate(komponenNama: string, isi: TorIsi): Promise<void> {
  const nama = (komponenNama || "").trim();
  const key = normKomp(nama);
  if (!key) throw new Error("Nama komponen wajib diisi.");
  const { error } = await sb().from("tor_isi_template").upsert(
    {
      komponen_key: key,
      komponen_nama: nama,
      data: {
        narasi: isi.narasi,
        tahapan: isi.tahapan.filter((t) => t.nama.trim()),
        sumberDana: isi.sumberDana === "BLU" ? "BLU" : "RM",
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "komponen_key" },
  );
  if (error) throw error;
}

/** Hapus satu template. */
export async function deleteTorTemplate(komponenKey: string): Promise<void> {
  const { error } = await sb().from("tor_isi_template").delete().eq("komponen_key", komponenKey);
  if (error) throw error;
}
