// SIPPT — salin subtree struktur (Sub Komponen / Akun / Detail beserta turunannya).
// Murni & dapat diuji di Node. Membuat id baru, memetakan ulang parent_id, dan
// mengelompokkan per kedalaman level agar induk selalu disisipkan sebelum anak.

const LEVEL_DEPTH: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3,
  KOMPONEN: 4, SUB_KOMPONEN: 5, AKUN: 6, HEADER: 6.5, DETAIL: 7,
};

export interface SubtreeRow {
  id: string;
  parent_id: string | null;
  level: string;
  referensi_id?: string | null;
  kode?: string | null;
  uraian?: string | null;
  volume?: number | null;
  satuan?: string | null;
  harga?: number | null;
  jumlah?: number;
  sumber_dana?: string | null;
  jenis_belanja?: string | null;
  urutan?: number;
  volume_rincian?: { qty: number; sat: string }[] | null;
}

export interface InsertRec {
  id: string;
  usulan_id: string;
  parent_id: string | null;
  level: string;
  referensi_id: string | null;
  kode: string | null;
  uraian: string | null;
  volume: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  sumber_dana: string | null;
  jenis_belanja: string | null;
  urutan: number;
  volume_rincian: { qty: number; sat: string }[] | null;
}

/** Kumpulkan node root + seluruh turunannya (pre-order). */
export function collectSubtree(rows: SubtreeRow[], rootId: string): SubtreeRow[] {
  const byId = new Map<string, SubtreeRow>(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, SubtreeRow[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r);
    childrenOf.set(r.parent_id, arr);
  }
  const out: SubtreeRow[] = [];
  const walk = (id: string) => {
    const n = byId.get(id);
    if (!n) return;
    out.push(n);
    const kids = (childrenOf.get(id) ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    for (const c of kids) walk(c.id);
  };
  walk(rootId);
  return out;
}

/**
 * Hasilkan batch-batch (terurut level dangkal→dalam) untuk menyalin subtree
 * `rootId` ke bawah induk baru `newParentId` dalam usulan yang sama.
 *
 * @param rows         seluruh baris usulan (sumber)
 * @param rootId       id node yang disalin (Sub Komponen / Akun / Detail)
 * @param newParentId  id induk tujuan tempel
 * @param usulanId     id usulan
 * @param genId        pembuat id baru, mis. () => crypto.randomUUID()
 * @param rootUrutan   urutan untuk node root di bawah induk baru (append)
 */
export function remapSubtree(
  rows: SubtreeRow[],
  rootId: string,
  newParentId: string,
  usulanId: string,
  genId: () => string,
  rootUrutan: number,
): InsertRec[][] {
  const subtree = collectSubtree(rows, rootId);
  const idMap = new Map<string, string>();
  for (const r of subtree) idMap.set(r.id, genId());

  const byDepth = new Map<number, InsertRec[]>();
  for (const r of subtree) {
    const isRoot = r.id === rootId;
    const rec: InsertRec = {
      id: idMap.get(r.id)!,
      usulan_id: usulanId,
      parent_id: isRoot
        ? newParentId
        : r.parent_id
          ? idMap.get(r.parent_id) ?? newParentId
          : newParentId,
      level: r.level,
      referensi_id: r.referensi_id ?? null,
      kode: r.kode ?? null,
      uraian: r.uraian ?? null,
      volume: r.volume ?? null,
      satuan: r.satuan ?? null,
      harga: r.harga ?? null,
      jumlah: r.jumlah ?? 0,
      sumber_dana: r.sumber_dana ?? null,
      jenis_belanja: r.jenis_belanja ?? null,
      urutan: isRoot ? rootUrutan : r.urutan ?? 0,
      volume_rincian: r.volume_rincian ?? null,
    };
    const d = LEVEL_DEPTH[r.level] ?? 0;
    const arr = byDepth.get(d) ?? [];
    arr.push(rec);
    byDepth.set(d, arr);
  }

  return [...byDepth.keys()].sort((a, b) => a - b).map((d) => byDepth.get(d)!);
}
