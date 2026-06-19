// SIPPT — parser "Kertas Kerja" SAKTI (.xlsx) → struktur usulan (hirarki penuh
// Program→Kegiatan→KRO→RO→Komponen→Sub Komponen→Akun→Detail) beserta rincian
// volume bertingkat. Murni & dapat diuji di Node.
//
// Tata letak kolom (indeks 0-based, sesuai SheetJS header:1):
//   1=KODE, 2=URAIAN,
//   segmen volume detail: (4,5)(7,8)(10,11)(13,14)(16,17) = (qty,sat) ×5,
//   18=Vol, 19=Satuan, 20=Harga, 21=Jumlah,
//   22..27 = breakdown ops/non-ops (W..AB), 32=Sumber Dana (akun).

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
}

const ORDER: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3,
  KOMPONEN: 4, SUB_KOMPONEN: 5, AKUN: 6, DETAIL: 7,
};
const SEG_COLS: [number, number][] = [[4, 5], [7, 8], [10, 11], [13, 14], [16, 17]];

function ct(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Tentukan level sebuah baris dari pola KODE + uraian. */
export function levelOf(kode: string, uraian: string): string | null {
  if (!kode) {
    return uraian.replace(/^\s+/, "").startsWith("-") ? "DETAIL" : null;
  }
  const segs = kode.split(".");
  if (segs.length === 1) {
    if (/^\d{6}$/.test(kode)) return "AKUN";
    if (/^\d{4}$/.test(kode)) return "KEGIATAN";
    if (/^\d{3}$/.test(kode)) return "KOMPONEN";
    if (/^[A-Z]$/.test(kode)) return "SUB_KOMPONEN";
    return null;
  }
  if (segs.length === 2) {
    return /^[A-Za-z]+$/.test(segs[1]) ? "KRO" : "UNIT"; // 3996.AEC vs 022.12
  }
  if (segs.length === 3) {
    return /^\d+$/.test(segs[1]) ? "PROGRAM" : "RO"; // 022.12.DL vs 3996.AEC.002
  }
  return null;
}

function jenisBelanja(row: unknown[]): string {
  const ops = (num(row[22]) ?? 0) + (num(row[23]) ?? 0) + (num(row[24]) ?? 0);
  const nonops = (num(row[25]) ?? 0) + (num(row[26]) ?? 0);
  return nonops > ops ? "NON_OPS" : "OPS";
}

export function parseKertasKerja(aoa: unknown[][]): KKImportResult {
  const nodes: KKImportNode[] = [];
  const stack: { level: string; node: KKImportNode }[] = [];
  const counts: Record<string, number> = {
    PROGRAM: 0, KEGIATAN: 0, KRO: 0, RO: 0, KOMPONEN: 0, SUB_KOMPONEN: 0, AKUN: 0, DETAIL: 0,
  };
  let seq = 0;

  for (const raw of aoa) {
    const row = raw ?? [];
    const kode = ct(row[1]);
    const uraianRaw = ct(row[2]);
    const lv = levelOf(kode, uraianRaw);
    if (!lv || lv === "UNIT") continue;

    while (stack.length && ORDER[stack[stack.length - 1].level] >= ORDER[lv]) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : null;

    const node: KKImportNode = {
      tempId: "n" + ++seq,
      parentTempId: parent ? parent.tempId : null,
      level: lv,
      kode: lv === "DETAIL" ? null : kode,
      uraian: lv === "DETAIL" ? uraianRaw.replace(/^[\s-]+/, "").trim() : uraianRaw,
      volume: null,
      satuan: null,
      harga: null,
      jumlah: num(row[21]) ?? 0,
      sumber_dana: null,
      jenis_belanja: null,
      segments: null,
    };

    if (lv === "DETAIL") {
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
      // warisi sumber dana & jenis dari akun induk
      const akun = parent && parent.level === "AKUN" ? parent : null;
      node.sumber_dana = akun?.sumber_dana ?? null;
      node.jenis_belanja = akun?.jenis_belanja ?? "OPS";
    } else if (lv === "AKUN") {
      node.sumber_dana = ct(row[32]) || null;
      node.jenis_belanja = jenisBelanja(row);
    }

    nodes.push(node);
    stack.push({ level: lv, node });
    counts[lv]++;
  }

  const programTotals = nodes
    .filter((n) => n.level === "PROGRAM")
    .map((n) => ({ kode: n.kode ?? "", jumlah: n.jumlah }));
  const total = programTotals.reduce((s, p) => s + p.jumlah, 0);
  return { nodes, counts, programTotals, total };
}
