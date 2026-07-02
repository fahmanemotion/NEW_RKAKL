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

/** Level struktural yang kodenya unik antar-sibling (punya unique index DB). */
const MERGE_LEVELS = new Set(['PROGRAM', 'KEGIATAN', 'KRO', 'RO', 'KOMPONEN', 'AKUN']);

function makeRec(
  r: SubtreeRow,
  id: string,
  parentId: string,
  usulanId: string,
  urutan: number,
): InsertRec {
  return {
    id,
    usulan_id: usulanId,
    parent_id: parentId,
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
    urutan,
    volume_rincian: r.volume_rincian ?? null,
  };
}

/**
 * Seperti remapSubtree, tetapi MENGGABUNG: bila node struktural (Program…Akun)
 * yang ditempel memiliki kode yang sama dengan anak yang SUDAH ADA di induk
 * tujuan, node existing itu DIPAKAI ULANG (tidak disisipkan lagi), dan anak-anak
 * dari node yang ditempel dimasukkan ke dalamnya (rekursif). Sub Komponen,
 * Header, dan Detail selalu disisipkan baru. Ini mencegah pelanggaran unique
 * index `uq_usulan_struktur_sibling_kode` saat menempel.
 *
 * @param rows       seluruh baris usulan (mencakup pohon tujuan yang sudah ada)
 * @param rootId     id node sumber yang disalin
 * @param newParentId induk tujuan tempel
 * @param usulanId   id usulan
 * @param genId      pembuat id baru
 * @param rootUrutan urutan node root bila disisipkan baru (append)
 */
export function remapSubtreeMerge(
  rows: SubtreeRow[],
  rootId: string,
  newParentId: string,
  usulanId: string,
  genId: () => string,
  rootUrutan: number,
): InsertRec[][] {
  const byId = new Map<string, SubtreeRow>(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, SubtreeRow[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r);
    childrenOf.set(r.parent_id, arr);
  }

  const key = (lvl: string, kode: string | null | undefined) =>
    `${lvl}::${(kode ?? '').trim()}`;

  // Indeks anak EXISTING per induk (hanya level yang digabung & berkode) →
  // dipakai untuk deteksi tabrakan. Diperbarui saat node baru dibuat agar
  // sibling berikutnya dalam batch tempel yang sama juga sadar.
  const childIndex = new Map<string, Map<string, string>>();
  for (const r of rows) {
    if (!r.parent_id || !MERGE_LEVELS.has(r.level) || !r.kode) continue;
    let m = childIndex.get(r.parent_id);
    if (!m) { m = new Map(); childIndex.set(r.parent_id, m); }
    m.set(key(r.level, r.kode), r.id);
  }

  const recs: InsertRec[] = [];

  const walk = (srcId: string, tgtParentId: string, urutan: number) => {
    const src = byId.get(srcId);
    if (!src) return;
    let effId: string;
    if (MERGE_LEVELS.has(src.level) && src.kode) {
      const existing = childIndex.get(tgtParentId)?.get(key(src.level, src.kode));
      if (existing) {
        effId = existing; // GABUNG: pakai node yang sudah ada sebagai induk.
      } else {
        effId = genId();
        recs.push(makeRec(src, effId, tgtParentId, usulanId, urutan));
        let m = childIndex.get(tgtParentId);
        if (!m) { m = new Map(); childIndex.set(tgtParentId, m); }
        m.set(key(src.level, src.kode), effId);
      }
    } else {
      effId = genId(); // Sub Komponen / Header / Detail: selalu baru.
      recs.push(makeRec(src, effId, tgtParentId, usulanId, urutan));
    }
    const kids = (childrenOf.get(srcId) ?? [])
      .slice()
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    kids.forEach((c, i) => walk(c.id, effId, i));
  };

  walk(rootId, newParentId, rootUrutan);

  // Kelompokkan per kedalaman agar induk selalu disisipkan sebelum anak.
  const byDepth = new Map<number, InsertRec[]>();
  for (const rec of recs) {
    const d = LEVEL_DEPTH[rec.level] ?? 0;
    const arr = byDepth.get(d) ?? [];
    arr.push(rec);
    byDepth.set(d, arr);
  }
  return [...byDepth.keys()].sort((a, b) => a - b).map((d) => byDepth.get(d)!);
}
