// SIPPT — data RAB (Rincian Anggaran Belanja). Murni & dapat diuji.
// Mengiris hasil buildKertasKerja menjadi unit RAB:
//   • per SUB KOMPONEN → rincian penuh (akun → detail),
//   • per KOMPONEN     → rekap (sub komponen sebagai baris ringkasan).
// Plus utilitas "terbilang" (angka → kata bahasa Indonesia).

import type { KKRow } from "./kertas-kerja";

export interface RabLine {
  id: string;
  kode: string;
  uraian: string;
  level: string; // SUB_KOMPONEN | AKUN | DETAIL
  depth: number;
  parentId: string | null;
  segments: { qty: number; sat: string }[] | null;
  vol: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  isDetail: boolean;
}

export interface RabUnit {
  id: string; // id unit (komponenId atau subKomponenId)
  level: "KOMPONEN" | "SUB_KOMPONEN";
  sheetName: string; // nama sheet, mis. "001" atau "001.A"
  komponenId: string;
  komponenKode: string;
  komponenUraian: string;
  subKode: string | null;
  subUraian: string | null;
  kroKode: string;
  kroUraian: string;
  roKode: string;
  roUraian: string;
  roVolume: number | null;
  roSatuan: string | null;
  programKode: string;
  programUraian: string;
  total: number;
  lines: RabLine[];
}

interface Ctx {
  byId: Map<string, KKRow>;
  childrenOf: Map<string, KKRow[]>;
  programUraian: string;
}

function makeCtx(rows: KKRow[]): Ctx {
  const byId = new Map<string, KKRow>(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, KKRow[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const arr = childrenOf.get(r.parentId) ?? [];
    arr.push(r);
    childrenOf.set(r.parentId, arr);
  }
  const programUraian = rows.find((r) => r.level === "PROGRAM")?.uraian ?? "";
  return { byId, childrenOf, programUraian };
}

function ancestorOf(ctx: Ctx, r: KKRow, level: string): KKRow | null {
  let cur: KKRow | null = r;
  while (cur && cur.parentId) {
    const p = ctx.byId.get(cur.parentId) ?? null;
    if (p && p.level === level) return p;
    cur = p;
  }
  return null;
}

function headerOf(ctx: Ctx, komponen: KKRow) {
  const ro = ancestorOf(ctx, komponen, "RO");
  const kro = ancestorOf(ctx, komponen, "KRO");
  const program = ancestorOf(ctx, komponen, "PROGRAM");
  return {
    kroKode: kro?.kode ?? "",
    kroUraian: kro?.uraian ?? "",
    roKode: ro?.kode ?? "",
    roUraian: ro?.uraian ?? "",
    roVolume: ro?.vol ?? null,
    roSatuan: ro?.satuan ?? null,
    programKode: program?.kode ?? "",
    programUraian: program?.uraian ?? ctx.programUraian,
  };
}

/** Kumpulkan subtree (pre-order) sebuah node menjadi RabLine[]. */
function collectLines(ctx: Ctx, root: KKRow): RabLine[] {
  const lines: RabLine[] = [];
  const walk = (node: KKRow, depth: number) => {
    for (const c of ctx.childrenOf.get(node.id) ?? []) {
      lines.push({
        id: c.id,
        kode: c.isDetail ? "" : c.kode,
        uraian: c.uraian,
        level: c.level,
        depth,
        parentId: c.parentId,
        segments: c.segments,
        vol: c.vol,
        satuan: c.satuan,
        harga: c.harga,
        jumlah: c.jumlah,
        isDetail: c.isDetail,
      });
      walk(c, depth + 1);
    }
  };
  walk(root, 0);
  return lines;
}

/** RAB per KOMPONEN — rekap: sub komponen jadi baris ringkasan. */
export function buildRabPerKomponen(rows: KKRow[]): RabUnit[] {
  const ctx = makeCtx(rows);
  return rows
    .filter((r) => r.level === "KOMPONEN")
    .map((k) => {
      const h = headerOf(ctx, k);
      const subs = (ctx.childrenOf.get(k.id) ?? []).filter(
        (c) => c.level === "SUB_KOMPONEN",
      );
      const lines: RabLine[] = subs.map((s) => ({
        id: s.id,
        kode: s.kode,
        uraian: s.uraian,
        level: "SUB_KOMPONEN",
        depth: 0,
        parentId: k.id,
        segments: null,
        vol: null,
        satuan: null,
        harga: null,
        jumlah: s.jumlah,
        isDetail: false,
      }));
      return {
        id: k.id,
        level: "KOMPONEN" as const,
        sheetName: k.kode,
        komponenId: k.id,
        komponenKode: k.kode,
        komponenUraian: k.uraian,
        subKode: null,
        subUraian: null,
        ...h,
        total: k.jumlah,
        lines,
      };
    });
}

/** RAB per SUB KOMPONEN — rincian penuh (akun → detail). */
export function buildRabPerSubKomponen(rows: KKRow[]): RabUnit[] {
  const ctx = makeCtx(rows);
  const out: RabUnit[] = [];
  for (const s of rows) {
    if (s.level !== "SUB_KOMPONEN") continue;
    const komponen = s.parentId ? ctx.byId.get(s.parentId) ?? null : null;
    if (!komponen) continue;
    const h = headerOf(ctx, komponen);
    out.push({
      id: s.id,
      level: "SUB_KOMPONEN",
      sheetName: `${komponen.kode}.${s.kode}`,
      komponenId: komponen.id,
      komponenKode: komponen.kode,
      komponenUraian: komponen.uraian,
      subKode: s.kode,
      subUraian: s.uraian,
      ...h,
      total: s.jumlah,
      lines: collectLines(ctx, s),
    });
  }
  return out;
}

/**
 * Nilai 8 kolom Rincian Perhitungan (C..J) untuk satu detail:
 * [C qty1, D sat1, E "x", F qty2, G sat2, H "x", I qty3, J sat3].
 * Maks 3 pasang (qty, satuan) dipisah "x"; sisanya null.
 */
export function rincianCells(
  segments: { qty: number; sat: string }[] | null,
  vol: number | null,
  satuan: string | null,
): (string | number | null)[] {
  const segs = (
    segments && segments.length
      ? segments
      : vol != null
        ? [{ qty: vol, sat: satuan ?? "" }]
        : []
  ).slice(0, 3);
  const cells: (string | number | null)[] = new Array(8).fill(null); // C D E F G H I J
  const pair: [number, number][] = [
    [0, 1],
    [3, 4],
    [6, 7],
  ];
  segs.forEach((s, idx) => {
    cells[pair[idx][0]] = s.qty;
    cells[pair[idx][1]] = s.sat;
    if (idx === 1) cells[2] = "x"; // E
    if (idx === 2) cells[5] = "x"; // H
  });
  return cells;
}

/** Teks rincian perhitungan, mis. "65 Org x 13 Bln" atau "10 Pack". */
export function rincianText(line: {
  segments: { qty: number; sat: string }[] | null;
  vol: number | null;
  satuan: string | null;
}): string {
  if (line.segments && line.segments.length > 0)
    return line.segments.map((s) => `${s.qty} ${s.sat}`).join(" x ");
  if (line.vol != null) return `${line.vol} ${line.satuan ?? ""}`.trim();
  return "";
}

/* ── Terbilang (angka bulat → kata) ──────────────────────────────────────── */

const ANGKA = [
  "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan",
  "sembilan", "sepuluh", "sebelas",
];

function eja(n: number): string {
  if (n < 12) return ANGKA[n];
  if (n < 20) return eja(n - 10) + " belas";
  if (n < 100)
    return eja(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + eja(n % 10) : "");
  if (n < 200) return "seratus" + (n - 100 ? " " + eja(n - 100) : "");
  if (n < 1000)
    return eja(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + eja(n % 100) : "");
  if (n < 2000) return "seribu" + (n - 1000 ? " " + eja(n - 1000) : "");
  if (n < 1_000_000)
    return eja(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + eja(n % 1000) : "");
  if (n < 1_000_000_000)
    return (
      eja(Math.floor(n / 1_000_000)) + " juta" +
      (n % 1_000_000 ? " " + eja(n % 1_000_000) : "")
    );
  if (n < 1_000_000_000_000)
    return (
      eja(Math.floor(n / 1_000_000_000)) + " milyar" +
      (n % 1_000_000_000 ? " " + eja(n % 1_000_000_000) : "")
    );
  return (
    eja(Math.floor(n / 1_000_000_000_000)) + " trilyun" +
    (n % 1_000_000_000_000 ? " " + eja(n % 1_000_000_000_000) : "")
  );
}

export function terbilang(n: number): string {
  const v = Math.floor(Math.abs(n || 0));
  const minus = (n || 0) < 0 ? "minus " : "";
  if (v === 0) return "nol rupiah";
  return minus + eja(v).replace(/\s+/g, " ").trim() + " rupiah";
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Kode pengenal file RAB sesuai format SAKTI: {RO}.{komponen}.{sub}.
 * Contoh: RO "3996.AEC.002" + komponen "051" + sub "A" → "3996.AEC.002.051.A".
 * Untuk unit per-Komponen (tanpa sub) → "3996.AEC.002.051".
 * Dengan ini user langsung mengenali file tanpa membukanya.
 */
export function rabFileCode(u: {
  level: "KOMPONEN" | "SUB_KOMPONEN";
  roKode: string;
  komponenKode: string;
  subKode: string | null;
}): string {
  const parts = [u.roKode, u.komponenKode];
  if (u.level === "SUB_KOMPONEN" && u.subKode) parts.push(u.subKode);
  return parts.filter(Boolean).join(".");
}

/** Bersihkan karakter yang ilegal untuk nama file (titik dipertahankan). */
export function safeFileName(s: string): string {
  return (s || "RAB").replace(/[\\/:*?"<>|\r\n]+/g, "_").trim() || "RAB";
}
