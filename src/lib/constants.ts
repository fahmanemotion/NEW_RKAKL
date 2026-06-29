// SIPPT — konstanta domain bersama (selaras dengan enum database).

export const LEVELS = ['PROGRAM', 'KEGIATAN', 'KRO', 'RO', 'KOMPONEN', 'SUB_KOMPONEN', 'AKUN', 'HEADER', 'DETAIL'] as const;
export type Level = (typeof LEVELS)[number];

// Urutan + label tampilan grid.
export const LEVEL_LABEL: Record<Level, string> = {
  PROGRAM: 'Program',
  KEGIATAN: 'Kegiatan',
  KRO: 'KRO',
  RO: 'RO',
  KOMPONEN: 'Komponen',
  SUB_KOMPONEN: 'Sub Komponen',
  AKUN: 'Akun',
  HEADER: 'Header',
  DETAIL: 'Detail Belanja',
};

// Anak dari tiap level (untuk tombol "Tambah …" dinamis ala SAKTI).
export const CHILD_OF: Partial<Record<Level, Level>> = {
  PROGRAM: 'KEGIATAN',
  KEGIATAN: 'KRO',
  KRO: 'RO',
  RO: 'KOMPONEN',
  KOMPONEN: 'SUB_KOMPONEN',
  SUB_KOMPONEN: 'AKUN',
  AKUN: 'DETAIL',
  HEADER: 'DETAIL',
};

export const STATUS = ['Draft', 'Diajukan', 'Direview', 'Disetujui', 'Final'] as const;
export type Status = (typeof STATUS)[number];

// Alur persetujuan: Draft → Diajukan → Direview → Disetujui → Final.
export const STATUS_NEXT: Record<Status, Status | null> = {
  Draft: 'Diajukan',
  Diajukan: 'Direview',
  Direview: 'Disetujui',
  Disetujui: 'Final',
  Final: null,
};

export const STATUS_COLOR: Record<Status, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Diajukan: 'bg-amber-100 text-amber-800',
  Direview: 'bg-sky-100 text-sky-800',
  Disetujui: 'bg-emerald-100 text-emerald-800',
  Final: 'bg-blue-100 text-blue-800',
};

export const KATEGORI_BELANJA = [
  'Belanja Pegawai', 'Belanja Barang', 'Belanja Modal',
] as const;
export type KategoriBelanja = (typeof KATEGORI_BELANJA)[number];

export const ROLES = ['Administrator', 'Operator', 'Reviewer', 'Pimpinan'] as const;
export type RoleName = (typeof ROLES)[number];

export const SUMBER_DANA = ['RM', 'BLU', 'SBSN'] as const;
export type SumberDana = (typeof SUMBER_DANA)[number];

// Jenis belanja detail: Operasional / Non Operasional (menggantikan pilihan
// Sumber Dana di form detail — sumber dana otomatis ikut akun).
export const JENIS_BELANJA = [
  { value: 'OPS', label: 'Operasional' },
  { value: 'NON_OPS', label: 'Non Operasional' },
] as const;
export type JenisBelanja = (typeof JENIS_BELANJA)[number]['value'];

// Format rupiah ribuan tanpa simbol (gaya kertas kerja SAKTI).
export const fmtN = (n: number | null | undefined) =>
  Math.round(Number(n) || 0).toLocaleString('id-ID');
export const fmtRp = (n: number | null | undefined) => 'Rp ' + fmtN(n);
