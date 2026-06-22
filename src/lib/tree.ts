// SIPPT — util tree-grid (MODUL 2). Murni & bebas framework agar mudah diuji.
// Mengubah daftar baris usulan_struktur (punya parent_id) menjadi daftar flat
// terurut untuk ditampilkan di grid ala SAKTI, lengkap dengan kedalaman (depth),
// agregasi jumlah ke atas, dan baris-info (Lokasi / Jumlah Komponen Utama / KPPN).

import type { Level, UsulanStruktur } from "@/types/database";

export interface GridRow {
  id: string;
  type: Level | "INFO" | "PROGRAM" | "KEGIATAN";
  depth: number;
  kode: string;
  uraian: string;
  volume?: number | null;
  satuan?: string | null;
  harga?: number | null;
  jumlah: number;
  sumber_dana?: string | null;
  jenis_belanja?: string | null;
  selectable: boolean;
  ref?: UsulanStruktur;
}

const DEPTH: Record<string, number> = {
  PROGRAM: 0,
  KEGIATAN: 1,
  KRO: 2,
  RO: 3,
  KOMPONEN: 4,
  SUB_KOMPONEN: 5,
  AKUN: 6,
  HEADER: 7,
  DETAIL: 7,
};

interface Node extends UsulanStruktur {
  children: Node[];
  agg: number;
}

/**
 * Kumpulkan id sebuah node beserta SELURUH turunannya (anak, cucu, … detail).
 * Dipakai saat menghapus: hapus Program → semua child sampai detail ikut.
 * Hasil terurut "anak terdalam dulu" agar aman dihapus berurutan.
 */
/**
 * Dari kumpulan id tercentang, kembalikan node "akar" — yaitu node yang
 * induknya TIDAK ikut tercentang. Hanya akar yang perlu disalin karena
 * subtree-nya otomatis ikut saat ditempel (pasteNode menyalin seluruh subtree).
 */
export function checkedRootNodes(
  rows: UsulanStruktur[],
  checked: Set<string>,
): UsulanStruktur[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const roots: UsulanStruktur[] = [];
  for (const id of checked) {
    const n = byId.get(id);
    if (!n) continue;
    if (n.parent_id && checked.has(n.parent_id)) continue;
    roots.push(n);
  }
  return roots;
}

export function subtreeIds(rows: UsulanStruktur[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r.id);
    childrenOf.set(r.parent_id, arr);
  }
  const out: string[] = [];
  const visit = (id: string) => {
    for (const c of childrenOf.get(id) ?? []) visit(c);
    out.push(id); // anak lebih dulu, induk belakangan
  };
  visit(rootId);
  return out;
}

/** Bangun pohon dari daftar datar + hitung agregasi jumlah tiap node. */
export function buildTree(rows: UsulanStruktur[]): { roots: Node[] } {
  const map = new Map<string, Node>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [], agg: 0 }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id))
      map.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  });
  // Level dengan kode terstruktur diurutkan by kode (hirarkis atas→bawah);
  // sisanya (Komponen/Sub Komponen/Detail) mengikuti urutan input.
  const CODE_SORT = new Set(["PROGRAM", "KEGIATAN", "KRO", "RO", "KOMPONEN", "AKUN"]);
  const byUrut = (a: Node, b: Node) =>
    CODE_SORT.has(a.level) && CODE_SORT.has(b.level)
      ? (a.kode || "").localeCompare(b.kode || "", undefined, { numeric: true }) ||
        a.urutan - b.urutan
      : a.urutan - b.urutan || (a.kode || "").localeCompare(b.kode || "");
  const sortRec = (n: Node) => {
    n.children.sort(byUrut);
    n.children.forEach(sortRec);
  };
  roots.sort(byUrut);
  roots.forEach(sortRec);

  const agg = (n: Node): number => {
    if (n.level === "DETAIL") return (n.agg = Number(n.jumlah) || 0);
    n.agg = n.children.reduce((s, c) => s + agg(c), 0);
    return n.agg;
  };
  roots.forEach(agg);
  return { roots };
}

/** Datarkan pohon menjadi GridRow[] terurut + sisipkan baris-info ala SAKTI. */
export function flattenForGrid(
  rows: UsulanStruktur[],
  opts: { kppn?: string; lokus?: string; collapse?: Set<string> | null } = {},
): { gridRows: GridRow[]; total: number } {
  const { roots } = buildTree(rows);
  const out: GridRow[] = [];
  const lokus = opts.lokus || "19.51-KOTA MAKASSAR";
  const kppn = opts.kppn || "054-Makassar I";
  // Saat `collapse` diset (boleh Set kosong), anak KOMPONEN disembunyikan
  // kecuali id komponennya tercantum (sudah di-expand lewat klik 2x).
  const collapse = opts.collapse ?? null;

  const push = (n: Node, depth: number, detailIndex?: number) => {
    out.push({
      id: n.id,
      type: n.level,
      depth,
      kode: n.kode || "",
      uraian:
        n.level === "DETAIL"
          ? `00.00. ${(detailIndex || 0) + 1} -${n.uraian || ""}`
          : n.uraian || "",
      volume:
        n.level === "DETAIL" || n.level === "KRO" || n.level === "RO"
          ? n.volume
          : null,
      satuan: n.satuan,
      harga: n.level === "DETAIL" ? n.harga : null,
      jumlah: n.agg,
      sumber_dana: n.sumber_dana,
      jenis_belanja: n.level === "DETAIL" ? n.jenis_belanja : null,
      selectable: true,
      ref: n,
    });
  };

  const info = (
    ownerId: string,
    depth: number,
    kode: string,
    uraian: string,
    jumlah = 0,
  ): GridRow => ({
    id: `info:${ownerId}:${uraian}`,
    type: "INFO",
    depth,
    kode,
    uraian,
    jumlah,
    selectable: false,
  });

  const walk = (n: Node, depth: number) => {
    push(n, depth);
    // Komponen yang diciutkan: tampilkan barisnya (total tetap terlihat) tetapi
    // jangan turunkan anak-anaknya sampai di-expand (klik 2x).
    if (collapse && n.level === "KOMPONEN" && !collapse.has(n.id)) return;
    if (n.level === "KRO")
      out.push(info(n.id, depth + 1, "", `(Lokasi :${lokus}) (KDIB=00 Base Line)`));
    if (n.level === "RO")
      out.push(info(n.id, depth + 1, "", "Jumlah Komponen Utama [100.00%]", n.agg));
    if (n.level === "AKUN") out.push(info(n.id, depth + 1, "", `(KPPN.${kppn})`));

    if (n.level === "AKUN") {
      // Anak akun: campuran HEADER (rekursi) dan DETAIL langsung (push).
      let di = 0;
      n.children.forEach((c) => {
        if (c.level === "DETAIL") push(c, depth + 1, di++);
        else walk(c, depth + 1); // HEADER
      });
    } else if (n.level === "HEADER") {
      n.children
        .filter((c) => c.level === "DETAIL")
        .forEach((c, i) => push(c, depth + 1, i));
    } else {
      n.children
        .filter((c) => c.level !== "DETAIL")
        .forEach((c) => walk(c, depth + 1));
    }
  };
  roots.forEach((n) => walk(n, DEPTH[n.level] ?? 0));

  const total = roots.reduce((s, n) => s + n.agg, 0);
  return { gridRows: out, total };
}

/**
 * Saring baris struktur untuk tampilan grid berdasarkan Program (+ KRO opsional).
 *  • tanpa programId          → semua baris (tanpa filter).
 *  • programId saja           → subtree program tsb (program + seluruh turunan).
 *  • programId + kroId        → leluhur KRO (program, kegiatan) + subtree KRO.
 * Mengembalikan subset `rows` yang konsisten (rantai induk tetap utuh).
 */
export function filterStruktur(
  rows: UsulanStruktur[],
  programId: string | null,
  kroId: string | null,
): UsulanStruktur[] {
  if (!programId) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r.id);
    childrenOf.set(r.parent_id, arr);
  }
  const allow = new Set<string>();
  const addSubtree = (id: string) => {
    allow.add(id);
    for (const c of childrenOf.get(id) ?? []) addSubtree(c);
  };
  const addAncestors = (id: string) => {
    let cur: UsulanStruktur | undefined = byId.get(id);
    while (cur) {
      allow.add(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
  };
  if (kroId && byId.has(kroId)) {
    addAncestors(kroId);
    addSubtree(kroId);
  } else {
    addSubtree(programId);
  }
  return rows.filter((r) => allow.has(r.id));
}

/**
 * Saring baris untuk menampilkan HANYA KRO yang dipilih (beserta leluhur
 * Program/Kegiatan dan seluruh turunannya). Set kosong → kembalikan semua.
 */
export function filterByKros(
  rows: UsulanStruktur[],
  kroIds: Set<string>,
): UsulanStruktur[] {
  if (!kroIds || kroIds.size === 0) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r.id);
    childrenOf.set(r.parent_id, arr);
  }
  const allow = new Set<string>();
  const addSubtree = (id: string) => {
    allow.add(id);
    for (const c of childrenOf.get(id) ?? []) addSubtree(c);
  };
  const addAncestors = (id: string) => {
    let cur: UsulanStruktur | undefined = byId.get(id);
    while (cur) {
      allow.add(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
  };
  for (const kroId of kroIds) {
    if (!byId.has(kroId)) continue;
    addAncestors(kroId);
    addSubtree(kroId);
  }
  return rows.filter((r) => allow.has(r.id));
}

/** Id PROGRAM leluhur dari sebuah node (atau null). */
export function programAncestorId(
  rows: UsulanStruktur[],
  nodeId: string,
): string | null {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let cur: UsulanStruktur | undefined = byId.get(nodeId);
  while (cur) {
    if (cur.level === "PROGRAM") return cur.id;
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return null;
}
