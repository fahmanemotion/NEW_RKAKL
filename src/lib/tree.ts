// SIPPT — util tree-grid (MODUL 2). Murni & bebas framework agar mudah diuji.
// Mengubah daftar baris usulan_struktur (punya parent_id) menjadi daftar flat
// terurut untuk ditampilkan di grid ala SAKTI, lengkap dengan kedalaman (depth),
// agregasi jumlah ke atas, dan baris-info (Lokasi / Jumlah Komponen Utama / KPPN).

import type { Level, UsulanStruktur } from '@/types/database';

export interface GridRow {
  id: string;
  type: Level | 'INFO' | 'PROGRAM' | 'KEGIATAN';
  depth: number;
  kode: string;
  uraian: string;
  volume?: number | null;
  satuan?: string | null;
  harga?: number | null;
  jumlah: number;
  sumber_dana?: string | null;
  selectable: boolean;
  ref?: UsulanStruktur;
}

const DEPTH: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3, KOMPONEN: 4, SUB_KOMPONEN: 5, AKUN: 6, DETAIL: 7,
};

interface Node extends UsulanStruktur {
  children: Node[];
  agg: number;
}

/** Bangun pohon dari daftar datar + hitung agregasi jumlah tiap node. */
export function buildTree(rows: UsulanStruktur[]): { roots: Node[] } {
  const map = new Map<string, Node>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [], agg: 0 }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) map.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  });
  const byUrut = (a: Node, b: Node) => a.urutan - b.urutan || a.kode!.localeCompare(b.kode || '');
  const sortRec = (n: Node) => { n.children.sort(byUrut); n.children.forEach(sortRec); };
  roots.sort(byUrut); roots.forEach(sortRec);

  const agg = (n: Node): number => {
    if (n.level === 'DETAIL') return (n.agg = Number(n.jumlah) || 0);
    n.agg = n.children.reduce((s, c) => s + agg(c), 0);
    return n.agg;
  };
  roots.forEach(agg);
  return { roots };
}

/** Datarkan pohon menjadi GridRow[] terurut + sisipkan baris-info ala SAKTI. */
export function flattenForGrid(
  rows: UsulanStruktur[],
  opts: { kppn?: string; lokus?: string } = {},
): { gridRows: GridRow[]; total: number } {
  const { roots } = buildTree(rows);
  const out: GridRow[] = [];
  const lokus = opts.lokus || '19.51-KOTA MAKASSAR';
  const kppn = opts.kppn || '054-Makassar I';

  const push = (n: Node, detailIndex?: number) => {
    out.push({
      id: n.id,
      type: n.level,
      depth: DEPTH[n.level],
      kode: n.kode || '',
      uraian:
        n.level === 'DETAIL'
          ? `00.00. ${(detailIndex || 0) + 1} -${n.uraian || ''}`
          : n.uraian || '',
      volume: n.level === 'DETAIL' || n.level === 'KRO' || n.level === 'RO' ? n.volume : null,
      satuan: n.satuan,
      harga: n.level === 'DETAIL' ? n.harga : null,
      jumlah: n.agg,
      sumber_dana: n.sumber_dana,
      selectable: true,
      ref: n,
    });
  };

  const info = (ownerId: string, depth: number, kode: string, uraian: string, jumlah = 0): GridRow => ({
    id: `info:${ownerId}:${uraian}`, type: 'INFO', depth, kode, uraian, jumlah, selectable: false,
  });

  const walk = (n: Node) => {
    push(n);
    const d = DEPTH[n.level];
    if (n.level === 'KRO') out.push(info(n.id, d + 1, '', `(Lokasi :${lokus}) (KDIB=00 Base Line)`));
    if (n.level === 'RO') out.push(info(n.id, d + 1, '', 'Jumlah Komponen Utama [100.00%]', n.agg));
    if (n.level === 'AKUN') out.push(info(n.id, d + 1, '', `(KPPN.${kppn})`));
    if (n.level === 'AKUN') {
      n.children.filter((c) => c.level === 'DETAIL').forEach((c, i) => push(c, i));
    } else {
      n.children.filter((c) => c.level !== 'DETAIL').forEach(walk);
    }
  };
  roots.forEach(walk);

  const total = roots.reduce((s, n) => s + n.agg, 0);
  return { gridRows: out, total };
}
