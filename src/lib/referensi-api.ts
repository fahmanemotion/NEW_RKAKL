// SIPPT — API referensi (MODUL 5). Pakai browser client; RLS membatasi tulis ke Administrator.
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MASTERS, type MasterDef, type ParsedRow } from "@/lib/referensi";

// Client longgar: tipe tabel belum memetakan Insert/Update (hindari error 'never').
const sb = (): SupabaseClient => createClient() as unknown as SupabaseClient;

/**
 * Ubah error Postgres menjadi pesan yang jelas. Pelanggaran UNIQUE (23505)
 * berarti kode duplikat — sistem menolak agar kode referensi tidak kembar.
 */
function refError(error: { code?: string; message?: string } | null): Error {
  if (error?.code === "23505")
    return new Error(
      "KODE_DUPLIKAT: Kode ini sudah ada pada induk yang sama. Sistem menolak kode kembar — gunakan kode lain, atau edit/hapus data yang sudah ada.",
    );
  return new Error(error?.message ?? "Terjadi kesalahan.");
}

export interface RefRecord {
  id: string;
  [k: string]: unknown;
}

/** Ambil daftar baris master (server-side search + pagination). */
export async function listMaster(
  def: MasterDef,
  q: string,
  page: number,
  perPage: number,
): Promise<{ rows: RefRecord[]; total: number }> {
  const from = (page - 1) * perPage;
  const sel = ["id", def.kodeCol, def.namaCol]
    .concat(def.extraFields?.map((f) => f.key) ?? [])
    .concat(def.parent ? [def.parent.fkCol] : [])
    .join(", ");

  let query = sb().from(def.table).select(sel, { count: "exact" });
  if (q.trim())
    query = query.or(`${def.kodeCol}.ilike.%${q}%,${def.namaCol}.ilike.%${q}%`);
  query = query
    .order(def.kodeCol, { ascending: true })
    .range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as RefRecord[], total: count ?? 0 };
}

/** Daftar induk (untuk dropdown pemilih induk pada form). */
export async function listParents(
  def: MasterDef,
): Promise<{ id: string; label: string }[]> {
  if (!def.parent) return [];
  const p = def.parent;
  const { data, error } = await sb()
    .from(p.table)
    .select(`id, ${p.kodeCol}, ${p.namaCol}`)
    .order(p.kodeCol, { ascending: true })
    .limit(1000);
  if (error) throw error;
  const list = (data ?? []) as unknown as Record<string, unknown>[];
  return list.map((r) => ({
    id: r.id as string,
    label: `${r[p.kodeCol]} — ${r[p.namaCol]}`,
  }));
}

export async function createMaster(
  def: MasterDef,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb().from(def.table).insert(values);
  if (error) throw refError(error);
}

export async function updateMaster(
  def: MasterDef,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb().from(def.table).update(values).eq("id", id);
  if (error) throw refError(error);
}

export async function deleteMaster(def: MasterDef, id: string): Promise<void> {
  const { error } = await sb().from(def.table).delete().eq("id", id);
  if (error) throw refError(error);
}

/** Update kode/nama Komponen (leaf jalur KODE). Menolak kode duplikat. */
export async function updateKomponen(
  id: string,
  values: { kode_komponen?: string; nama_komponen?: string; jenis?: string },
): Promise<void> {
  const { error } = await sb().from("master_komponen").update(values).eq("id", id);
  if (error) throw refError(error);
}

/** Hapus satu Komponen pada jalur KODE. */
export async function deleteKomponen(id: string): Promise<void> {
  const { error } = await sb().from("master_komponen").delete().eq("id", id);
  if (error) throw refError(error);
}

/**
 * Hapus SELURUH kode referensi (Program → Kegiatan → KRO → RO → Komponen →
 * Sub Komponen). Berguna saat berpindah satker agar bisa impor template baru.
 * Dihapus dari level terdalam ke terluar agar aman walau tanpa cascade.
 * BA (master_ba) sengaja dipertahankan karena bersifat standar & dipakai ulang.
 * Data usulan tidak ikut terhapus (referensi_id tanpa FK; program_id usulan
 * hanya di-set null oleh aturan ON DELETE SET NULL).
 */
export async function deleteAllKode(): Promise<void> {
  const ZERO = "00000000-0000-0000-0000-000000000000";
  const tables = [
    "master_sub_komponen",
    "master_komponen",
    "master_ro",
    "master_kro",
    "master_kegiatan",
    "master_program",
  ];
  for (const t of tables) {
    const { error } = await sb().from(t).delete().neq("id", ZERO);
    if (error) throw refError(error);
  }
}

/**
 * Bulk import: resolve kode induk → id, lalu upsert per baris valid.
 * Mengembalikan ringkasan { inserted, skipped, failed, errors }.
 */
export async function bulkImport(
  def: MasterDef,
  rows: ParsedRow[],
): Promise<{
  inserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const valid = rows.filter((r) => r.valid);
  const errors: string[] = [];
  let inserted = 0,
    failed = 0;

  // Peta kode induk → id (sekali ambil) bila berinduk.
  let parentMap = new Map<string, string>();
  if (def.parent) {
    const p = def.parent;
    const { data } = await sb()
      .from(p.table)
      .select(`id, ${p.kodeCol}`)
      .limit(5000);
    const plist = (data ?? []) as unknown as Record<string, unknown>[];
    plist.forEach((r) => parentMap.set(String(r[p.kodeCol]), r.id as string));
  }

  // Susun payload
  const payloads: Record<string, unknown>[] = [];
  for (const r of valid) {
    const row: Record<string, unknown> = { ...r.values };
    if (def.parent) {
      const pid = r.parentCode ? parentMap.get(r.parentCode) : undefined;
      if (!pid) {
        failed++;
        errors.push(
          `Induk "${r.parentCode}" tidak ditemukan untuk kode ${r.values[def.kodeCol]}`,
        );
        continue;
      }
      row[def.parent.fkCol] = pid;
    }
    payloads.push(row);
  }

  // Upsert massal — onConflict pakai kolom unik (induk+kode atau kode).
  const conflictCols = def.parent
    ? `${def.parent.fkCol},${def.kodeCol}`
    : def.kodeCol;
  if (payloads.length) {
    const { error, count } = await sb()
      .from(def.table)
      .upsert(payloads, {
        onConflict: conflictCols,
        ignoreDuplicates: true,
        count: "exact",
      });
    if (error) {
      errors.push(error.message);
      failed += payloads.length;
    } else inserted = count ?? payloads.length;
  }

  return { inserted, skipped: rows.length - valid.length, failed, errors };
}

export { MASTERS };

/* ─────────────── Import KODE gabungan (BA→Komponen sekaligus) ─────────────── */
import { parseKodeSheet } from "@/lib/kode-import";

type IdMap = Map<string, string>;

async function buildMap(table: string, kodeCol: string, fkCol?: string): Promise<IdMap> {
  const cols = fkCol ? `id, ${fkCol}, ${kodeCol}` : `id, ${kodeCol}`;
  const { data, error } = await sb().from(table).select(cols).limit(100000);
  if (error) throw error;
  const m: IdMap = new Map();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const key = fkCol ? `${row[fkCol]}::${row[kodeCol]}` : String(row[kodeCol]);
    m.set(key, String(row.id));
  }
  return m;
}

async function upsertLevel(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb()
      .from(table)
      .upsert(rows.slice(i, i + 500), { onConflict, ignoreDuplicates: false });
    if (error) throw error;
  }
}

export interface KodeImportResult {
  counts: { ba: number; program: number; kegiatan: number; kro: number; ro: number; komponen: number };
  totalRows: number;
  // Baris yang TIDAK bisa dikaitkan ke induknya (jalur kode tak ditemukan) —
  // sebelumnya dibuang diam-diam. Dilaporkan agar bisa diperbaiki di sumbernya.
  dropped: { ro: number; komponen: number };
  droppedSamples: { ro: string[]; komponen: string[] };
}

/**
 * Impor seluruh kode (BA→Program→Kegiatan→KRO→RO→Komponen) dari satu sheet Excel.
 * Upsert per level berurutan, resolusi induk berdasarkan jalur lengkap.
 */
export async function importKodeGabungan(raw: unknown[][]): Promise<KodeImportResult> {
  const p = parseKodeSheet(raw);

  // BA
  await upsertLevel("master_ba", p.ba.map((b) => ({ kode_ba: b.kode, nama_ba: b.nama })), "kode_ba");
  const baMap = await buildMap("master_ba", "kode_ba");

  // Program (kode_program UNIK GLOBAL agar tidak terduplikat lintas BA).
  // Dedup payload by kode lebih dulu, lalu upsert onConflict kode_program.
  const progSeen = new Set<string>();
  const progRows = p.program
    .map((x) => {
      const baId = baMap.get(x.ba);
      if (!baId) return null;
      const key = x.kode.trim();
      if (progSeen.has(key)) return null;
      progSeen.add(key);
      return { ba_id: baId, kode_program: x.kode, nama_program: x.nama };
    })
    .filter(Boolean) as Record<string, unknown>[];
  await upsertLevel("master_program", progRows, "kode_program");
  // Peta GLOBAL kode_program → id (induk BA tidak lagi jadi kunci).
  const progMap = await buildMap("master_program", "kode_program");

  // Kegiatan (induk: Program — dicari global by kode program)
  const kegRows = p.kegiatan
    .map((x) => {
      const pid = progMap.get(x.program);
      return pid ? { program_id: pid, kode_kegiatan: x.kode, nama_kegiatan: x.nama } : null;
    })
    .filter(Boolean) as Record<string, unknown>[];
  await upsertLevel("master_kegiatan", kegRows, "program_id,kode_kegiatan");
  const kegMap = await buildMap("master_kegiatan", "kode_kegiatan", "program_id");

  const progIdOf = (_ba: string, program: string) => progMap.get(program);
  const kegIdOf = (ba: string, program: string, keg: string) =>
    kegMap.get(`${progIdOf(ba, program)}::${keg}`);

  // KRO (induk: Kegiatan)
  const kroRows = p.kro
    .map((x) => {
      const kid = kegIdOf(x.ba, x.program, x.kegiatan);
      return kid ? { kegiatan_id: kid, kode_kro: x.kode, nama_kro: x.nama } : null;
    })
    .filter(Boolean) as Record<string, unknown>[];
  await upsertLevel("master_kro", kroRows, "kegiatan_id,kode_kro");
  const kroMap = await buildMap("master_kro", "kode_kro", "kegiatan_id");
  const kroIdOf = (ba: string, program: string, keg: string, kro: string) =>
    kroMap.get(`${kegIdOf(ba, program, keg)}::${kro}`);

  // RO (induk: KRO)
  const droppedRo: string[] = [];
  const roRows = p.ro
    .map((x) => {
      const krid = kroIdOf(x.ba, x.program, x.kegiatan, x.kro);
      if (!krid) { droppedRo.push(`${x.kro}.${x.kode} — ${x.nama}`); return null; }
      return { kro_id: krid, kode_ro: x.kode, nama_ro: x.nama };
    })
    .filter(Boolean) as Record<string, unknown>[];
  await upsertLevel("master_ro", roRows, "kro_id,kode_ro");
  const roMap = await buildMap("master_ro", "kode_ro", "kro_id");
  const roIdOf = (ba: string, program: string, keg: string, kro: string, ro: string) =>
    roMap.get(`${kroIdOf(ba, program, keg, kro)}::${ro}`);

  // Komponen (induk: RO)
  const droppedKomp: string[] = [];
  const kompRows = p.komponen
    .map((x) => {
      const roid = roIdOf(x.ba, x.program, x.kegiatan, x.kro, x.ro);
      if (!roid) { droppedKomp.push(`${x.kro}.${x.ro}.${x.kode} — ${x.nama}`); return null; }
      return { ro_id: roid, kode_komponen: x.kode, nama_komponen: x.nama };
    })
    .filter(Boolean) as Record<string, unknown>[];
  await upsertLevel("master_komponen", kompRows, "ro_id,kode_komponen");

  return {
    counts: {
      ba: p.ba.length, program: progRows.length, kegiatan: kegRows.length,
      kro: kroRows.length, ro: roRows.length, komponen: kompRows.length,
    },
    totalRows: p.dataRows,
    dropped: { ro: droppedRo.length, komponen: droppedKomp.length },
    droppedSamples: { ro: droppedRo.slice(0, 8), komponen: droppedKomp.slice(0, 8) },
  };
}

/** Ambil seluruh kode sebagai jalur lengkap untuk ditampilkan (BA→Komponen). */
export interface KodePathRow {
  komponenId: string;
  ba: string; program: string; programNama: string;
  kegiatan: string; kegiatanNama: string;
  kro: string; kroNama: string; ro: string; roNama: string;
  komponen: string; komponenNama: string; komponenJenis: string;
}

export async function listKodePaths(): Promise<KodePathRow[]> {
  const { data, error } = await sb()
    .from("master_komponen")
    .select(
      `id, kode_komponen, nama_komponen, jenis,
       master_ro!inner ( kode_ro, nama_ro,
         master_kro!inner ( kode_kro, nama_kro,
           master_kegiatan!inner ( kode_kegiatan, nama_kegiatan,
             master_program!inner ( kode_program, nama_program,
               master_ba!inner ( kode_ba ) ) ) ) )`,
    )
    .limit(100000);
  if (error) throw error;
  type Nested = Record<string, unknown> & { master_ro?: Record<string, unknown> };
  const out: KodePathRow[] = [];
  for (const k of (data ?? []) as unknown as Nested[]) {
    const ro = (k.master_ro ?? {}) as Record<string, unknown>;
    const kro = (ro.master_kro ?? {}) as Record<string, unknown>;
    const keg = (kro.master_kegiatan ?? {}) as Record<string, unknown>;
    const prog = (keg.master_program ?? {}) as Record<string, unknown>;
    const ba = (prog.master_ba ?? {}) as Record<string, unknown>;
    out.push({
      komponenId: String(k.id ?? ""),
      ba: String(ba.kode_ba ?? ""),
      program: String(prog.kode_program ?? ""), programNama: String(prog.nama_program ?? ""),
      kegiatan: String(keg.kode_kegiatan ?? ""), kegiatanNama: String(keg.nama_kegiatan ?? ""),
      kro: String(kro.kode_kro ?? ""), kroNama: String(kro.nama_kro ?? ""),
      ro: String(ro.kode_ro ?? ""), roNama: String(ro.nama_ro ?? ""),
      komponen: String(k.kode_komponen ?? ""), komponenNama: String(k.nama_komponen ?? ""),
      komponenJenis: String(k.jenis ?? ""),
    });
  }
  out.sort((a, b) =>
    (a.program + a.kegiatan + a.kro + a.ro + a.komponen).localeCompare(
      b.program + b.kegiatan + b.kro + b.ro + b.komponen,
    ),
  );
  return out;
}
