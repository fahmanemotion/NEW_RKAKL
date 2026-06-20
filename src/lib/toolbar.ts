// SIPPT — aksi toolbar dinamis ala SAKTI.
// Tiap node memunculkan DUA tombol tambah: "Tambah <level sama>" (sibling) dan
// "Tambah <level anak>" (child), kecuali DETAIL yang hanya punya "Tambah Detail".
import type { Level } from './constants';

export type SelType = Level | 'INFO' | null;

export interface ToolbarAction {
  key: string;
  label: string;
  kind: 'add' | 'edit' | 'delete' | 'copy' | 'paste';
  addLevel?: Level;             // level yang akan ditambahkan (untuk kind 'add')
  as?: 'sibling' | 'child';     // sibling = level sama (induk = induk node terpilih)
                                // child   = level di bawahnya (induk = node terpilih)
}

// Level anak (turunan satu tingkat) dari tiap level.
const CHILD: Partial<Record<Level, Level>> = {
  PROGRAM: 'KEGIATAN',
  KEGIATAN: 'KRO',
  KRO: 'RO',
  RO: 'KOMPONEN',
  KOMPONEN: 'SUB_KOMPONEN',
  SUB_KOMPONEN: 'AKUN',
  AKUN: 'DETAIL',
};

// Label tampilan tiap level (untuk teks tombol "Tambah …").
const LABEL: Record<Level, string> = {
  PROGRAM: 'Program',
  KEGIATAN: 'Kegiatan',
  KRO: 'KRO',
  RO: 'RO',
  KOMPONEN: 'Komponen',
  SUB_KOMPONEN: 'Sub Komponen',
  AKUN: 'Akun',
  DETAIL: 'Detail',
};

// Level yang bisa di-Edit langsung dari toolbar.
const EDITABLE = new Set<Level>(['SUB_KOMPONEN', 'AKUN', 'DETAIL']);
// Level yang bisa di-Salin (beserta seluruh turunannya).
const COPYABLE = new Set<Level>(['SUB_KOMPONEN', 'AKUN', 'DETAIL']);

const DEL: ToolbarAction = { key: 'delete', label: 'Hapus', kind: 'delete' };
const EDIT: ToolbarAction = { key: 'edit', label: 'Edit', kind: 'edit' };
const COPY: ToolbarAction = { key: 'copy', label: 'Salin', kind: 'copy' };

// Induk tempel (level node terpilih) → level isi clipboard yang cocok ditempel.
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

const addSibling = (lv: Level): ToolbarAction => ({
  key: 'add-self-' + lv,
  label: 'Tambah ' + LABEL[lv],
  kind: 'add',
  addLevel: lv,
  as: 'sibling',
});
const addChild = (lv: Level): ToolbarAction => ({
  key: 'add-child-' + lv,
  label: 'Tambah ' + LABEL[lv],
  kind: 'add',
  addLevel: lv,
  as: 'child',
});

/**
 * Hierarki penuh ala SAKTI. Saat sebuah node dipilih, toolbar menampilkan:
 *   1) "Tambah <level sama>"  (menambah saudara/sibling di induk yang sama)
 *   2) "Tambah <level anak>"  (menambah turunan langsung) — kecuali DETAIL
 *   3) Edit            (Sub Komponen / Akun / Detail)
 *   4) Salin           (Sub Komponen / Akun / Detail, beserta turunannya)
 *   5) Hapus           (node + seluruh turunannya)
 *   6) Tempel          (bila isi clipboard cocok untuk induk yang dipilih)
 * Tanpa pilihan → hanya "Tambah Program".
 */
export function toolbarActions(
  sel: SelType,
  clipboardLevel: Level | null = null,
): ToolbarAction[] {
  if (!sel || sel === 'INFO') {
    return [addSibling('PROGRAM')];
  }

  const lv = sel as Level;
  const out: ToolbarAction[] = [];

  // 1) Tambah sibling (level sama).
  out.push(addSibling(lv));
  // 2) Tambah anak (level di bawahnya), bila ada.
  const child = CHILD[lv];
  if (child) out.push(addChild(child));
  // 3) Edit.
  if (EDITABLE.has(lv)) out.push(EDIT);
  // 4) Salin.
  if (COPYABLE.has(lv)) out.push(COPY);
  // 5) Hapus.
  out.push(DEL);
  // 6) Tempel (bila clipboard cocok untuk induk terpilih).
  if (clipboardLevel && PASTE_TARGET[lv] === clipboardLevel) {
    out.push({ key: 'paste', label: PASTE_LABEL[clipboardLevel] ?? 'Tempel', kind: 'paste' });
  }

  return out;
}
