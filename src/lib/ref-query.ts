// SIPPT — konfigurasi pencarian referensi per level (murni, bisa diuji di Node).
import type { Level } from './constants';

export interface RefQuery {
  table: string;
  kodeCol: string;
  namaCol: string;
  parentCol?: string;
  parentId?: string;
  extraCol?: string;
}

/** Petakan level → tabel master + kolom + filter induk untuk modal pemilihan. */
export function refQueryFor(level: Level, parentRefId: string | null): RefQuery | null {
  switch (level) {
    case 'PROGRAM':
      return { table: 'master_program', kodeCol: 'kode_program', namaCol: 'nama_program' };
    case 'KEGIATAN':
      return { table: 'master_kegiatan', kodeCol: 'kode_kegiatan', namaCol: 'nama_kegiatan', parentCol: 'program_id', parentId: parentRefId ?? undefined };
    case 'KRO':
      return { table: 'master_kro', kodeCol: 'kode_kro', namaCol: 'nama_kro', parentCol: 'kegiatan_id', parentId: parentRefId ?? undefined };
    case 'RO':
      return { table: 'master_ro', kodeCol: 'kode_ro', namaCol: 'nama_ro', parentCol: 'kro_id', parentId: parentRefId ?? undefined };
    case 'KOMPONEN':
      return { table: 'master_komponen', kodeCol: 'kode_komponen', namaCol: 'nama_komponen', parentCol: 'ro_id', parentId: parentRefId ?? undefined, extraCol: 'jenis' };
    case 'AKUN':
      return { table: 'master_akun', kodeCol: 'kode_akun', namaCol: 'nama_akun', extraCol: 'kategori_belanja' };
    default:
      return null; // SUB_KOMPONEN & DETAIL = input manual
  }
}
