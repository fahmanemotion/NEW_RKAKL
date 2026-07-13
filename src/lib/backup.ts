// SIPPT — konfigurasi & helper BACKUP/RESTORE seluruh data aplikasi.
// Backup = ekspor semua tabel DATA (referensi, input anggaran, TOR, pengaturan)
// ke satu berkas. Kertas Kerja & RAB TIDAK disimpan terpisah karena keduanya
// DITURUNKAN dari usulan_struktur → cukup mem-backup struktur. Tabel AUTH
// (user_profiles/roles/permissions), sesi, & audit TIDAK diikutkan: itu spesifik
// server/akun dan dibuat ulang oleh migrasi di server tujuan.

export const BACKUP_APP = "SIRANGGA";
export const BACKUP_VERSION = 1;

// Tabel yang di-backup, dalam URUTAN AMAN-FK untuk RESTORE (induk lebih dulu).
export const BACKUP_TABLES: string[] = [
  "master_ba",
  "master_kementerian",
  "master_unit_eselon1",
  "master_satker",
  "master_program",
  "master_kegiatan",
  "master_kro",
  "master_ro",
  "master_komponen",
  "master_sub_komponen",
  "master_akun",
  "master_tor_kode",
  "master_penandatangan",
  "pengaturan_rab",
  "usulan_anggaran",
  "usulan_struktur",
  "tor_narasi",
  "tor_tahapan",
  "tor_komponen_opsi",
  "tor_isi_template",
  "dokumen_kertas_kerja",
];

// Kolom yang mereferensi auth.users → di-NULL-kan agar restore ke server dengan
// AKUN BERBEDA tidak gagal foreign key (siapa pembuat/peninjau tak wajib ada).
export const AUTH_NULL_FIELDS: Record<string, string[]> = {
  usulan_anggaran: ["created_by", "reviewed_by", "approved_by"],
  dokumen_kertas_kerja: ["uploaded_by"],
};

// Target onConflict untuk upsert saat restore. Tabel tanpa kolom `id` memakai
// kunci komposit/teks-nya; selain itu default "id".
export const CONFLICT_KEY: Record<string, string> = {
  tor_narasi: "usulan_id,komponen_id,section_id",
  tor_komponen_opsi: "usulan_id,komponen_id",
  tor_isi_template: "komponen_key",
};

// Kedalaman level untuk urutan sisip parent→anak pada usulan_struktur.
export const STRUKTUR_DEPTH: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3, KOMPONEN: 4,
  SUB_KOMPONEN: 5, AKUN: 6, HEADER: 6.5, DETAIL: 7,
};

export interface BackupManifest {
  app: string;
  version: number;
  createdAt: string;
  counts: Record<string, number>;
}
export interface BackupFile {
  manifest: BackupManifest;
  tables: Record<string, Record<string, unknown>[]>;
}

type Row = Record<string, unknown>;

/** NULL-kan kolom referensi auth agar restore lintas-akun tak gagal FK. */
export function stripAuthFields(table: string, rows: Row[]): Row[] {
  const fields = AUTH_NULL_FIELDS[table];
  if (!fields || !fields.length) return rows;
  return rows.map((r) => {
    const c = { ...r };
    for (const f of fields) c[f] = null;
    return c;
  });
}

/** Urutkan usulan_struktur menaik per kedalaman level → induk selalu sebelum anak. */
export function orderStrukturRows(rows: Row[]): Row[] {
  return [...rows].sort(
    (a, b) =>
      (STRUKTUR_DEPTH[String(a.level)] ?? 9) - (STRUKTUR_DEPTH[String(b.level)] ?? 9),
  );
}

/** Validasi bahwa objek adalah berkas backup SIRANGGA yang sah. */
export function isValidBackup(x: unknown): x is BackupFile {
  const b = x as BackupFile | null;
  return !!b && !!b.manifest && b.manifest.app === BACKUP_APP && !!b.tables && typeof b.tables === "object";
}

export function backupFileName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `backup-sirangga-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`;
}

/** Ringkasan jumlah baris (untuk ditampilkan sebelum/ sesudah). */
export function totalRows(counts: Record<string, number>): number {
  return Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);
}
