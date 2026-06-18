// SIPPT — data RAB (Rincian Anggaran Belanja) per komponen. Murni & dapat diuji.
// Mengiris hasil buildKertasKerja menjadi satu RAB untuk tiap KOMPONEN, lengkap
// dengan konteks induk (KRO/RO/Program) untuk kepala dokumen, dan utilitas
// "terbilang" (angka → kata bahasa Indonesia).

import type { KKRow } from "./kertas-kerja";

export interface RabLine {
  id: string;
  kode: string;
  uraian: string;
  level: string; // SUB_KOMPONEN | AKUN | DETAIL
  depth: number; // indentasi relatif dalam komponen (0 = sub komponen)
  parentId: string | null;
  segments: { qty: number; sat: string }[] | null;
  vol: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  isDetail: boolean;
}

export interface RabKomponen {
  komponenId: string;
  komponenKode: string;
  komponenUraian: string;
  kroKode: string;
  kroUraian: string;
  roKode: string;
  roUraian: string;
  roVolume: number | null;
  roSatuan: string | null;
  programUraian: string;
  total: number;
  lines: RabLine[]; // sub komponen → akun → detail (pre-order)
}

/** Iris struktur menjadi daftar RAB, satu per KOMPONEN. */
export function buildRabPerKomponen(rows: KKRow[]): RabKomponen[] {
  const byId = new Map<string, KKRow>(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, KKRow[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const arr = childrenOf.get(r.parentId) ?? [];
    arr.push(r);
    childrenOf.set(r.parentId, arr);
  }
  const ancestorOf = (r: KKRow, level: string): KKRow | null => {
    let cur: KKRow | null = r;
    while (cur && cur.parentId) {
      const p = byId.get(cur.parentId) ?? null;
      if (p && p.level === level) return p;
      cur = p;
    }
    return null;
  };
  const programUraian = rows.find((r) => r.level === "PROGRAM")?.uraian ?? "";

  const komponens = rows.filter((r) => r.level === "KOMPONEN");
  return komponens.map((k) => {
    const ro = ancestorOf(k, "RO");
    const kro = ancestorOf(k, "KRO");
    const lines: RabLine[] = [];
    const walk = (node: KKRow, depth: number) => {
      for (const c of childrenOf.get(node.id) ?? []) {
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
    walk(k, 0);
    return {
      komponenId: k.id,
      komponenKode: k.kode,
      komponenUraian: k.uraian,
      kroKode: kro?.kode ?? "",
      kroUraian: kro?.uraian ?? "",
      roKode: ro?.kode ?? "",
      roUraian: ro?.uraian ?? "",
      roVolume: ro?.vol ?? null,
      roSatuan: ro?.satuan ?? null,
      programUraian,
      total: k.jumlah,
      lines,
    };
  });
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
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function eja(n: number): string {
  if (n < 12) return ANGKA[n];
  if (n < 20) return eja(n - 10) + " belas";
  if (n < 100)
    return eja(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + eja(n % 10) : "");
  if (n < 200) return "seratus" + (n - 100 ? " " + eja(n - 100) : "");
  if (n < 1000)
    return (
      eja(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + eja(n % 100) : "")
    );
  if (n < 2000) return "seribu" + (n - 1000 ? " " + eja(n - 1000) : "");
  if (n < 1_000_000)
    return (
      eja(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + eja(n % 1000) : "")
    );
  if (n < 1_000_000_000)
    return (
      eja(Math.floor(n / 1_000_000)) +
      " juta" +
      (n % 1_000_000 ? " " + eja(n % 1_000_000) : "")
    );
  if (n < 1_000_000_000_000)
    return (
      eja(Math.floor(n / 1_000_000_000)) +
      " milyar" +
      (n % 1_000_000_000 ? " " + eja(n % 1_000_000_000) : "")
    );
  return (
    eja(Math.floor(n / 1_000_000_000_000)) +
    " trilyun" +
    (n % 1_000_000_000_000 ? " " + eja(n % 1_000_000_000_000) : "")
  );
}

/** "nol rupiah", "seribu rupiah", dst. (huruf kecil; pemanggil boleh kapitalisasi). */
export function terbilang(n: number): string {
  const v = Math.floor(Math.abs(n || 0));
  const minus = (n || 0) < 0 ? "minus " : "";
  if (v === 0) return "nol rupiah";
  return (minus + eja(v).replace(/\s+/g, " ").trim() + " rupiah");
}

/** Kapitalisasi tiap kata (meniru PROPER pada template). */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
