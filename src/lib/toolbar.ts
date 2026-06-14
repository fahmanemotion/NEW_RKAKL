// SIPPT — aksi toolbar dinamis ala SAKTI (klik parent → tombol anak + Hapus).
import type { Level } from './constants';

export type SelType = Level | 'INFO' | null;

export interface ToolbarAction {
  key: string;
  label: string;
  kind: 'add' | 'edit' | 'delete';
  addLevel?: Level; // level yang akan ditambahkan (untuk kind 'add')
}

const ADD: Partial<Record<Level, { key: string; label: string; addLevel: Level }>> = {
  PROGRAM: { key: 'add-kegiatan', label: 'Tambah Kegiatan', addLevel: 'KEGIATAN' },
  KEGIATAN: { key: 'add-kro', label: 'Tambah KRO', addLevel: 'KRO' },
  KRO: { key: 'add-ro', label: 'Tambah RO', addLevel: 'RO' },
  RO: { key: 'add-komponen', label: 'Tambah Komponen', addLevel: 'KOMPONEN' },
  KOMPONEN: { key: 'add-subkomp', label: 'Tambah Sub Komponen', addLevel: 'SUB_KOMPONEN' },
  SUB_KOMPONEN: { key: 'add-akun', label: 'Tambah Akun', addLevel: 'AKUN' },
  AKUN: { key: 'add-detail', label: 'Tambah Detail', addLevel: 'DETAIL' },
};

const DEL: ToolbarAction = { key: 'delete', label: 'Hapus', kind: 'delete' };

/**
 * Hierarki penuh ala SAKTI. Tiap level (Program…Akun) menampilkan tombol
 * "Tambah <anak>" + "Hapus" (menghapus node beserta seluruh turunannya).
 * Detail menampilkan Edit + Hapus. Tanpa pilihan → Tambah Program.
 */
export function toolbarActions(sel: SelType): ToolbarAction[] {
  if (sel === 'DETAIL') {
    return [
      { key: 'edit', label: 'Edit', kind: 'edit' },
      DEL,
    ];
  }
  if (sel && sel !== 'INFO' && ADD[sel as Level]) {
    const a = ADD[sel as Level]!;
    return [{ key: a.key, label: a.label, kind: 'add', addLevel: a.addLevel }, DEL];
  }
  // null / INFO / lainnya
  return [{ key: 'add-program', label: 'Tambah Program', kind: 'add', addLevel: 'PROGRAM' }];
}
