// SIPPT — API KODE TOR (metadata kinerja per komponen). Browser client; RLS
// membatasi tulis ke Administrator.
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTorKodeSheet, type TorKodeRec } from "@/lib/tor-kode";

const sb = (): SupabaseClient => createClient() as unknown as SupabaseClient;
const TABLE = "master_tor_kode";

export interface TorKodeRow extends TorKodeRec {
  id: string;
}
export interface TorKodeImportResult {
  inserted: number;
  updated: number;
  total: number;
}

/**
 * Impor gabungan dari sheet: UPSERT tahan-banting tanpa bergantung pada
 * ON CONFLICT — baris yang komponennya sudah ada (abaikan huruf besar/kecil)
 * DIPERBARUI, sisanya di-INSERT. Sehingga impor ulang untuk mengoreksi teks
 * kinerja tetap berfungsi.
 */
export async function importTorKode(raw: unknown[][]): Promise<TorKodeImportResult> {
  const recs = parseTorKodeSheet(raw);
  if (recs.length === 0) throw new Error("Sheet tidak berisi baris data KODE TOR yang valid.");

  const { data: existing, error: exErr } = await sb().from(TABLE).select("id, komponen").limit(100000);
  if (exErr) throw exErr;
  const idByKey = new Map<string, string>();
  for (const r of (existing ?? []) as { id: string; komponen: string }[]) {
    idByKey.set(r.komponen.trim().toLowerCase(), r.id);
  }

  const toInsert: TorKodeRec[] = [];
  let updated = 0;
  for (const rec of recs) {
    const key = rec.komponen.trim().toLowerCase();
    const id = idByKey.get(key);
    if (id) {
      const { error } = await sb().from(TABLE).update(rec).eq("id", id);
      if (error) throw error;
      updated++;
    } else {
      toInsert.push(rec);
    }
  }
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await sb().from(TABLE).insert(toInsert.slice(i, i + 500));
    if (error) throw error;
  }
  return { inserted: toInsert.length, updated, total: recs.length };
}

/** Daftar seluruh KODE TOR (urut nama komponen). */
export async function listTorKode(): Promise<TorKodeRow[]> {
  const { data, error } = await sb()
    .from(TABLE)
    .select(
      "id, komponen, indikator_kinerja_kegiatan, sasaran_kegiatan, indikator_kinerja_program, sasaran_program, unit_eselon",
    )
    .order("komponen", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TorKodeRow[];
}

export async function updateTorKode(id: string, fields: Partial<TorKodeRec>): Promise<void> {
  const { error } = await sb().from(TABLE).update(fields).eq("id", id);
  if (error) {
    if ((error as { code?: string }).code === "23505")
      throw new Error("Komponen ini sudah ada di KODE TOR. Gunakan nama komponen lain.");
    throw error;
  }
}

export async function createTorKode(rec: TorKodeRec): Promise<void> {
  if (!rec.komponen.trim()) throw new Error("Nama komponen wajib diisi.");
  const { error } = await sb().from(TABLE).insert(rec);
  if (error) {
    if ((error as { code?: string }).code === "23505")
      throw new Error("Komponen ini sudah ada di KODE TOR. Gunakan nama komponen lain.");
    throw error;
  }
}

export async function deleteTorKode(id: string): Promise<void> {
  const { error } = await sb().from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllTorKode(): Promise<void> {
  const { error } = await sb().from(TABLE).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}
