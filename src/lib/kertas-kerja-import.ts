// SIPPT — parser "Kertas Kerja" SAKTI (.xlsx) → struktur usulan (hirarki penuh
// Program→Kegiatan→KRO→RO→Komponen→Sub Komponen→Akun→Detail) + rincian volume
// bertingkat. Murni & dapat diuji di Node.
//
// Mendukung dua format kode RO:
//   • lama : 3996.AEC.002  (3 segmen)
//   • baru : 3996.AE002    (2 segmen: 2 huruf + 3 angka)
// Detail dikenali dari KODE kosong + uraian (dengan/atau tanpa awalan "-"),
// dan hanya bila berada di bawah AKUN.
//
// DEDUP: node berkode sama pada induk yang sama (Program..Akun) DIGABUNG menjadi
// satu — anak-anaknya diakumulasikan — sehingga tidak ada data terduplikat dan
// trigger anti-duplikat database tidak terpicu. Detail selalu ditambahkan.
//
// Tata letak kolom (indeks 0-based, SheetJS header:1):
//   1=KODE, 2=URAIAN, segmen (4,5)(7,8)(10,11)(13,14)(16,17),
//   18=Vol, 19=Satuan, 20=Harga, 21=Jumlah, 22..27=ops/non-ops, 32=Sumber Dana.

export interface KKImportNode {
  tempId: string;
  parentTempId: string | null;
  level: string;
  kode: string | null;
  uraian: string;
  volume: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  sumber_dana: string | null;
  jenis_belanja: string | null;
  segments: { qty: number; sat: string }[] | null;
}

export interface KKImportResult {
  nodes: KKImportNode[];
  counts: Record<string, number>;
  programTotals: { kode: string; jumlah: number }[];
  total: number;
  skipped: { orphanDetails: number; preProgramRows: number };
}

const ORDER: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3,
  KOMPONEN: 4, SUB_KOMPONEN: 5, AKUN: 6, DETAIL: 7,
};
const SEG_COLS: [number, number][] = [[4, 5], [7, 8], [10, 11], [13, 14], [16, 17]];
const MERGE_LEVELS = new Set(["PROGRAM", "KEGIATAN", "KRO", "RO", "KOMPONEN", "SUB_KOMPONEN", "AKUN"]);

function ct(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Tentukan level sebuah baris dari pola KODE (+ uraian untuk DETAIL). */
export function levelOf(kode: string, uraian: string): string | null {
  if (!kode) return uraian ? "DETAIL" : null;
  const s = kode.split(".");
  if (s.length === 1) {
    if (/^\d{6}$/.test(kode)) return "AKUN";
    if (/^\d{4}$/.test(kode)) return "KEGIATAN";
    if (/^\d{3}$/.test(kode)) return "KOMPONEN";
    if (/^[A-Z]$/.test(kode)) return "SUB_KOMPONEN";
    return null;
  }
  if (s.length === 2) {
    const seg = s[1];
    if (/^\d+$/.test(seg)) return "UNIT";          // 022.12
    if (/^[A-Z]{3}$/.test(seg)) return "KRO";       // 3996.AEC
    if (/^[A-Z]{2}\d{3}$/.test(seg)) return "RO";   // 3996.AE002
    return /^[A-Za-z]+$/.test(seg) ? "KRO" : "RO"; // fallback
  }
  if (s.length === 3) {
    return /^\d+$/.test(s[1]) ? "PROGRAM" : "RO";   // 022.12.DL ; 3996.AEC.002 (lama)
  }
  return null;
}

function jenisBelanja(row: unknown[]): string {
  const ops = (num(row[22]) ?? 0) + (num(row[23]) ?? 0) + (num(row[24]) ?? 0);
  const nonops = (num(row[25]) ?? 0) + (num(row[26]) ?? 0);
  return nonops > ops ? "NON_OPS" : "OPS";
}

interface TNode {
  tempId: string;
  level: string;
  kode: string | null;
  uraian: string;
  volume: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  sumber_dana: string | null;
  jenis_belanja: string | null;
  segments: { qty: number; sat: string }[] | null;
  parent: TNode | null;
  children: TNode[];
  byKey: Map<string, TNode>;
}

export function parseKertasKerja(aoa: unknown[][]): KKImportResult {
  const roots: TNode[] = [];
  const rootByKey = new Map<string, TNode>();
  const stack: TNode[] = [];
  let seq = 0;
  let started = false;
  let skipPreProgram = 0;
  let skipOrphanDetail = 0;

  const mk = (lv: string, kode: string | null, uraian: string): TNode => ({
    tempId: "n" + ++seq, level: lv, kode, uraian,
    volume: null, satuan: null, harga: null, jumlah: 0,
    sumber_dana: null, jenis_belanja: null, segments: null,
    parent: null, children: [], byKey: new Map(),
  });

  for (const raw of aoa) {
    const row = raw ?? [];
    const kode = ct(row[1]);
    const uraianRaw = ct(row[2]);
    const lv = levelOf(kode, uraianRaw);
    if (!lv || lv === "UNIT") continue;

    if (!started) {
      if (lv === "PROGRAM") started = true;
      else { skipPreProgram++; continue; } // blok rekap/operasional di atas Program
    }

    while (stack.length && ORDER[stack[stack.length - 1].level] >= ORDER[lv]) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : null;

    if (lv === "DETAIL") {
      if (!parent || parent.level !== "AKUN") { skipOrphanDetail++; continue; }
      const node = mk("DETAIL", null, uraianRaw.replace(/^[\s-]+/, "").trim());
      const segs: { qty: number; sat: string }[] = [];
      for (const [cq, cs] of SEG_COLS) {
        const q = num(row[cq]);
        const s = ct(row[cs]);
        if (q !== null && s && s !== "x") segs.push({ qty: q, sat: s });
      }
      node.segments = segs.length >= 2 ? segs : null;
      node.volume = num(row[18]);
      node.satuan = ct(row[19]) || null;
      node.harga = num(row[20]);
      node.jumlah = num(row[21]) ?? 0;
      node.sumber_dana = parent.sumber_dana ?? null;
      node.jenis_belanja = parent.jenis_belanja ?? "OPS";
      parent.children.push(node);
      stack.push(node);
      continue;
    }

    const key = (kode || uraianRaw).toUpperCase();
    const bag = parent ? parent.byKey : rootByKey;
    const existing = MERGE_LEVELS.has(lv) ? bag.get(key) : undefined;
    if (existing) {
      stack.push(existing);
      continue;
    }
    const node = mk(lv, kode, uraianRaw);
    node.jumlah = num(row[21]) ?? 0;
    if (lv === "AKUN") {
      node.sumber_dana = ct(row[32]) || null;
      node.jenis_belanja = jenisBelanja(row);
    }
    node.parent = parent;
    if (parent) parent.children.push(node);
    else roots.push(node);
    bag.set(key, node);
    stack.push(node);
  }

  const nodes: KKImportNode[] = [];
  const counts: Record<string, number> = {
    PROGRAM: 0, KEGIATAN: 0, KRO: 0, RO: 0, KOMPONEN: 0, SUB_KOMPONEN: 0, AKUN: 0, DETAIL: 0,
  };
  const walk = (n: TNode, parentTempId: string | null) => {
    nodes.push({
      tempId: n.tempId, parentTempId, level: n.level, kode: n.kode, uraian: n.uraian,
      volume: n.volume, satuan: n.satuan, harga: n.harga, jumlah: n.jumlah,
      sumber_dana: n.sumber_dana, jenis_belanja: n.jenis_belanja, segments: n.segments,
    });
    counts[n.level] = (counts[n.level] ?? 0) + 1;
    for (const c of n.children) walk(c, n.tempId);
  };
  for (const r of roots) walk(r, null);

  const programTotals = roots
    .filter((n) => n.level === "PROGRAM")
    .map((n) => ({ kode: n.kode ?? "", jumlah: n.jumlah }));
  const total = programTotals.reduce((s, p) => s + p.jumlah, 0);
  return {
    nodes, counts, programTotals, total,
    skipped: { orphanDetails: skipOrphanDetail, preProgramRows: skipPreProgram },
  };
}
