"use server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  BACKUP_TABLES,
  CONFLICT_KEY,
  isValidBackup,
  orderStrukturRows,
  stripAuthFields,
  type BackupFile,
} from "@/lib/backup";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function admin(): { from: (t: string) => any } {
  return createAdminClient() as unknown as { from: (t: string) => any };
}

/** Baca SELURUH baris sebuah tabel (paginasi 1000). */
async function readAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: { from: (t: string) => any },
  table: string,
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  let from = 0;
  const all: Record<string, unknown>[] = [];
  for (;;) {
    const { data, error } = await sb.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as Record<string, unknown>[];
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export interface ExportResult {
  ok: boolean;
  backup?: BackupFile;
  error?: string;
}

/** Ekspor seluruh data aplikasi menjadi satu objek backup. Administrator saja. */
export async function exportBackupAction(): Promise<ExportResult> {
  try {
    const user = await requireUser();
    if (user.role !== "Administrator")
      throw new Error("Hanya Administrator yang dapat membuat backup.");

    const sb = admin();
    const tables: Record<string, Record<string, unknown>[]> = {};
    const counts: Record<string, number> = {};
    for (const t of BACKUP_TABLES) {
      try {
        const rows = await readAll(sb, t);
        tables[t] = stripAuthFields(t, rows);
        counts[t] = rows.length;
      } catch {
        // Tabel belum ada (mis. tor_isi_template belum dimigrasi) → lewati aman.
        tables[t] = [];
        counts[t] = 0;
      }
    }
    return {
      ok: true,
      backup: {
        manifest: {
          app: BACKUP_APP,
          version: BACKUP_VERSION,
          createdAt: new Date().toISOString(),
          counts,
        },
        tables,
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface ImportResult {
  ok: boolean;
  restored?: Record<string, number>;
  skipped?: string[];
  errors?: string[];
  error?: string;
}

/**
 * Pulihkan data dari backup (upsert per PK — idempoten & aman diulang).
 * Ditujukan untuk server/basis-data BARU (hasil migrasi, belum berisi data).
 * Administrator saja.
 */
export async function importBackupAction(backup: BackupFile): Promise<ImportResult> {
  try {
    const user = await requireUser();
    if (user.role !== "Administrator")
      throw new Error("Hanya Administrator yang dapat memulihkan backup.");
    if (!isValidBackup(backup))
      throw new Error("Berkas bukan backup SIRANGGA yang sah.");
    if (backup.manifest.version > BACKUP_VERSION)
      throw new Error(
        `Versi backup (${backup.manifest.version}) lebih baru dari aplikasi ini (${BACKUP_VERSION}). Perbarui aplikasi lebih dulu.`,
      );

    const sb = admin();
    const restored: Record<string, number> = {};
    const skipped: string[] = [];
    const errors: string[] = [];

    // Urutan BACKUP_TABLES sudah aman-FK (induk dulu).
    for (const t of BACKUP_TABLES) {
      let rows = (backup.tables[t] ?? []) as Record<string, unknown>[];
      if (!rows.length) {
        skipped.push(t);
        continue;
      }
      rows = stripAuthFields(t, rows);
      // usulan_struktur mereferensi diri (parent_id) → sisip induk (level lebih
      // tinggi) lebih dulu antar-batch agar FK tak dilanggar.
      if (t === "usulan_struktur") rows = orderStrukturRows(rows);
      const onConflict = CONFLICT_KEY[t] ?? "id";

      let ok = 0;
      try {
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await sb.from(t).upsert(chunk, { onConflict });
          if (error) throw error;
          ok += chunk.length;
        }
        restored[t] = ok;
      } catch (e) {
        errors.push(`${t}: ${(e as Error).message}`);
      }
    }

    return { ok: errors.length === 0, restored, skipped, errors };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
