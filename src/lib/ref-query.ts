// SIPPT — konfigurasi pencarian referensi per level (murni, bisa diuji di Node).
import type { Level } from './constants';

export interface RefQuery {
  table: string;
  kodeCol: string;
  namaCol: string;
  parentCol?: string;
  parentId?: string;
  // Bila diisi, filter memakai IN (parentCol, parentIds) — dipakai komponen agar
  // bisa membaca dari beberapa master_ro yang cocok jalur kode (RO generik).
  parentIds?: string[];
  extraCol?: string;
  // True bila kode pada level ini UNIK GLOBAL (mis. Program, Akun). Picker akan
  // mendedup hanya berdasarkan kode (membuang duplikat data master walau nama
  // berbeda). Untuk level lain dedup tetap by kode+nama agar item berkode sama
  // beda induk tidak ikut terbuang.
  globalKode?: boolean;
}

/** Petakan level → tabel master + kolom + filter induk untuk modal pemilihan. */
export function refQueryFor(level: Level, parentRefId: string | null): RefQuery | null {
  switch (level) {
    case 'PROGRAM':
      return { table: 'master_program', kodeCol: 'kode_program', namaCol: 'nama_program', globalKode: true };
    case 'KEGIATAN':
      return { table: 'master_kegiatan', kodeCol: 'kode_kegiatan', namaCol: 'nama_kegiatan', parentCol: 'program_id', parentId: parentRefId ?? undefined };
    case 'KRO':
      return { table: 'master_kro', kodeCol: 'kode_kro', namaCol: 'nama_kro', parentCol: 'kegiatan_id', parentId: parentRefId ?? undefined };
    case 'RO':
      return { table: 'master_ro', kodeCol: 'kode_ro', namaCol: 'nama_ro', parentCol: 'kro_id', parentId: parentRefId ?? undefined };
    case 'KOMPONEN':
      return { table: 'master_komponen', kodeCol: 'kode_komponen', namaCol: 'nama_komponen', parentCol: 'ro_id', parentId: parentRefId ?? undefined, extraCol: 'jenis' };
    case 'AKUN':
      return { table: 'master_akun', kodeCol: 'kode_akun', namaCol: 'nama_akun', extraCol: 'kategori_belanja', globalKode: true };
    default:
      return null; // SUB_KOMPONEN & DETAIL = input manual
  }
}
