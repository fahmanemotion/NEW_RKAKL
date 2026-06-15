// SIPPT — API referensi (MODUL 5). Pakai browser client; RLS membatasi tulis ke Administrator.
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MASTERS, type MasterDef, type ParsedRow } from "@/lib/referensi";

// Client longgar: tipe tabel belum memetakan Insert/Update (hindari error 'never').
const sb = (): SupabaseClient => createClient() as unknown as SupabaseClient;

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
  if (error) throw error;
}

export async function updateMaster(
  def: MasterDef,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb().from(def.table).update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteMaster(def: MasterDef, id: string): Promise<void> {
  const { error } = await sb().from(def.table).delete().eq("id", id);
  if (error) throw error;
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
