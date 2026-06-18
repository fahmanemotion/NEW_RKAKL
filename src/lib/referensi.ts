// SIPPT — definisi master & logika pemetaan Import (murni, bisa diuji di Node).

export interface MasterField {
  key: string;            // kolom DB
  label: string;
  type?: 'text' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface MasterDef {
  table: string;
  label: string;
  kodeCol: string;
  namaCol: string;
  parent?: { table: string; fkCol: string; label: string; kodeCol: string; namaCol: string };
  extraFields?: MasterField[];          // kolom tambahan non-kode/nama
  importCols: string[];                 // urutan kolom Excel: [kodeInduk?, kode, nama, ...extra]
}

export const MASTERS: Record<string, MasterDef> = {
  program: {
    table: 'master_program', label: 'Program', kodeCol: 'kode_program', namaCol: 'nama_program',
    parent: { table: 'master_ba', fkCol: 'ba_id', label: 'BA', kodeCol: 'kode_ba', namaCol: 'nama_ba' },
    importCols: ['kode_ba', 'kode_program', 'nama_program'],
  },
  kegiatan: {
    table: 'master_kegiatan', label: 'Kegiatan', kodeCol: 'kode_kegiatan', namaCol: 'nama_kegiatan',
    parent: { table: 'master_program', fkCol: 'program_id', label: 'Program', kodeCol: 'kode_program', namaCol: 'nama_program' },
    importCols: ['kode_program', 'kode_kegiatan', 'nama_kegiatan'],
  },
  kro: {
    table: 'master_kro', label: 'KRO', kodeCol: 'kode_kro', namaCol: 'nama_kro',
    parent: { table: 'master_kegiatan', fkCol: 'kegiatan_id', label: 'Kegiatan', kodeCol: 'kode_kegiatan', namaCol: 'nama_kegiatan' },
    extraFields: [{ key: 'satuan', label: 'Satuan' }],
    importCols: ['kode_kegiatan', 'kode_kro', 'nama_kro', 'satuan'],
  },
  ro: {
    table: 'master_ro', label: 'RO', kodeCol: 'kode_ro', namaCol: 'nama_ro',
    parent: { table: 'master_kro', fkCol: 'kro_id', label: 'KRO', kodeCol: 'kode_kro', namaCol: 'nama_kro' },
    extraFields: [{ key: 'satuan', label: 'Satuan' }],
    importCols: ['kode_kro', 'kode_ro', 'nama_ro', 'satuan'],
  },
  komponen: {
    table: 'master_komponen', label: 'Komponen', kodeCol: 'kode_komponen', namaCol: 'nama_komponen',
    parent: { table: 'master_ro', fkCol: 'ro_id', label: 'RO', kodeCol: 'kode_ro', namaCol: 'nama_ro' },
    extraFields: [{ key: 'jenis', label: 'Jenis', type: 'select', options: [
      { value: 'Utama', label: 'Utama' }, { value: 'Pendukung', label: 'Pendukung' },
    ] }],
    importCols: ['kode_ro', 'kode_komponen', 'nama_komponen', 'jenis'],
  },
  sub_komponen: {
    table: 'master_sub_komponen', label: 'Sub Komponen', kodeCol: 'kode_sub_komponen', namaCol: 'nama_sub_komponen',
    parent: { table: 'master_komponen', fkCol: 'komponen_id', label: 'Komponen', kodeCol: 'kode_komponen', namaCol: 'nama_komponen' },
    importCols: ['kode_komponen', 'kode_sub_komponen', 'nama_sub_komponen'],
  },
  akun: {
    table: 'master_akun', label: 'Akun', kodeCol: 'kode_akun', namaCol: 'nama_akun',
    extraFields: [
      { key: 'kategori_belanja', label: 'Kategori Belanja', type: 'select', required: true, options: [
        'Belanja Pegawai', 'Belanja Barang', 'Belanja Modal', 'Belanja Operasional', 'Belanja Non Operasional',
      ].map((v) => ({ value: v, label: v })) },
      { key: 'sumber_dana', label: 'Sumber Dana', type: 'select', options: ['RM', 'BLU', 'SBSN'].map((v) => ({ value: v, label: v })) },
    ],
    importCols: ['kode_akun', 'nama_akun', 'kategori_belanja', 'sumber_dana'],
  },
  penandatangan: {
    table: 'master_penandatangan', label: 'Penandatangan', kodeCol: 'posisi', namaCol: 'nama',
    extraFields: [
      { key: 'jenis', label: 'Jenis TTD', type: 'select', required: true, options: [
        { value: 'SUB_KOMPONEN', label: 'TTD Sub Komponen' },
        { value: 'KOMPONEN', label: 'TTD Komponen' },
      ] },
      { key: 'jabatan', label: 'Jabatan' },
      { key: 'pangkat_golongan', label: 'Pangkat/Golongan' },
      { key: 'nip', label: 'NIP' },
    ],
    importCols: ['jenis', 'posisi', 'nama', 'jabatan', 'pangkat_golongan', 'nip'],
  },
};

export type MasterKey = keyof typeof MASTERS;

/** Normalisasi teks sel Excel. */
export function cleanText(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Normalisasi kode: buang spasi; jika murni angka & ada padTo, beri nol di depan. */
export function cleanCode(v: unknown, padTo?: number): string {
  const s = cleanText(v);
  if (!s) return '';
  if (padTo && /^\d+$/.test(s)) return s.padStart(padTo, '0');
  return s;
}

const PAD: Record<string, number> = { kode_kegiatan: 4, kode_ro: 3, kode_komponen: 3 };

export interface ParsedRow {
  values: Record<string, string>;   // kolom DB → nilai (sudah dibersihkan)
  parentCode?: string;              // kode induk (jika master berinduk)
  valid: boolean;
  error?: string;
}

/**
 * Petakan baris mentah Excel (array sel) → ParsedRow sesuai definisi master.
 * Mengembalikan { rows, headerSkipped } — baris header otomatis dilewati.
 */
export function mapImportRows(master: MasterDef, raw: unknown[][]): { rows: ParsedRow[] } {
  const cols = master.importCols;
  const hasParent = !!master.parent;
  const out: ParsedRow[] = [];

  // Kumpulan token yang menandakan baris HEADER (mis. "kode_ro", "Uraian KRO").
  const headerTokens = new Set<string>([
    ...cols.map((c) => c.toLowerCase()),
    'ba', 'kode', 'program', 'kegiatan', 'kro', 'ro', 'komponen', 'sub komponen',
    'akun', 'uraian', 'nama', 'satuan', 'jenis', 'kategori', 'kategori belanja',
    'kategori_belanja', 'sumber dana', 'sumber_dana',
  ]);

  for (const r of raw) {
    if (!r || r.every((c) => c === null || c === undefined || cleanText(c) === '')) continue;
    // Lewati baris header: sel pertama (atau sel kedua) berisi nama/label kolom.
    const first = cleanText(r[0]).toLowerCase();
    const second = cleanText(r[1]).toLowerCase();
    if (headerTokens.has(first) || headerTokens.has(second)) continue;

    const values: Record<string, string> = {};
    let parentCode: string | undefined;
    cols.forEach((col, i) => {
      const cell = r[i];
      if (hasParent && i === 0) { parentCode = cleanCode(cell, PAD[col]); return; }
      values[col] = PAD[col] ? cleanCode(cell, PAD[col]) : cleanText(cell);
    });

    // Validasi minimal: kode & nama wajib; induk wajib bila berinduk.
    const kode = values[master.kodeCol];
    const nama = values[master.namaCol];
    let error: string | undefined;
    if (!kode) error = 'Kode kosong';
    else if (hasParent && !parentCode) error = 'Kode induk kosong';
    else if (master.table === 'master_akun' && !values['kategori_belanja']) error = 'Kategori belanja kosong';
    if (nama === '' ) values[master.namaCol] = kode;   // nama boleh diisi kode bila kosong

    out.push({ values, parentCode, valid: !error, error });
  }
  return { rows: out };
}
