// SIPPT — aksi toolbar dinamis ala SAKTI (klik parent → tombol anak + Hapus).
import type { Level } from './constants';

export type SelType = Level | 'INFO' | null;

export interface ToolbarAction {
  key: string;
  label: string;
  kind: 'add' | 'edit' | 'delete' | 'copy' | 'paste';
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
const EDIT: ToolbarAction = { key: 'edit', label: 'Edit', kind: 'edit' };
const COPY: ToolbarAction = { key: 'copy', label: 'Salin', kind: 'copy' };

// Level induk tujuan tempel → level yang ada di clipboard.
const PASTE_TARGET: Partial<Record<Level, Level>> = {
  KOMPONEN: 'SUB_KOMPONEN',
  SUB_KOMPONEN: 'AKUN',
  AKUN: 'DETAIL',
};
const PASTE_LABEL: Record<string, string> = {
  SUB_KOMPONEN: 'Tempel Sub Komponen',
  AKUN: 'Tempel Akun',
  DETAIL: 'Tempel Detail',
};

/**
 * Hierarki penuh ala SAKTI. Tiap level (Program…Akun) menampilkan tombol
 * "Tambah <anak>" + "Hapus" (menghapus node beserta seluruh turunannya).
 * Sub Komponen, Akun, dan Detail dapat di-Salin (beserta turunannya).
 * Bila ada isi clipboard yang cocok untuk induk terpilih, muncul tombol "Tempel".
 * Tanpa pilihan → Tambah Program.
 */
export function toolbarActions(
  sel: SelType,
  clipboardLevel: Level | null = null,
): ToolbarAction[] {
  const out: ToolbarAction[] = [];

  if (sel === 'DETAIL') {
    out.push(EDIT, COPY, DEL);
  } else if (sel && sel !== 'INFO' && ADD[sel as Level]) {
    const a = ADD[sel as Level]!;
    const add: ToolbarAction = { key: a.key, label: a.label, kind: 'add', addLevel: a.addLevel };
    // Sub Komponen & Akun: tambah anak, Edit, Salin, Hapus.
    if (sel === 'SUB_KOMPONEN' || sel === 'AKUN') out.push(add, EDIT, COPY, DEL);
    else out.push(add, DEL);
  } else {
    out.push({ key: 'add-program', label: 'Tambah Program', kind: 'add', addLevel: 'PROGRAM' });
  }

  // Tombol Tempel: bila clipboard cocok untuk induk yang sedang dipilih.
  if (clipboardLevel && sel && sel !== 'INFO' && PASTE_TARGET[sel as Level] === clipboardLevel) {
    out.push({ key: 'paste', label: PASTE_LABEL[clipboardLevel] ?? 'Tempel', kind: 'paste' });
  }

  return out;
}
