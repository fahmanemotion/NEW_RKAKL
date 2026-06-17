// SIPPT — data Laporan (murni & bisa diuji di Node).
// Menyusun rekapitulasi anggaran dari hasil buildKertasKerja (KKRow/KKBuckets):
// per sumber dana, per jenis belanja, per kategori (OPS/NON), dan ringkasan
// struktur tingkat atas (Program → Kegiatan → KRO → RO).

import type { KKRow, KKBuckets } from "./kertas-kerja";

export interface RekapItem {
  label: string;
  value: number;
  pct: number; // 0..100
}

const pctOf = (v: number, total: number) => (total ? (v / total) * 100 : 0);

/** Rekap per sumber dana (RM / BLU / SBSN). */
export function rekapSumber(
  total: KKBuckets,
  totalJumlah: number,
): RekapItem[] {
  return [
    { label: "Rupiah Murni (RM)", value: total.rm, pct: pctOf(total.rm, totalJumlah) },
    { label: "BLU", value: total.blu, pct: pctOf(total.blu, totalJumlah) },
    { label: "SBSN", value: total.sbsn, pct: pctOf(total.sbsn, totalJumlah) },
  ];
}

/** Rekap per jenis belanja (Pegawai / Barang Ops / Barang Non / Modal). */
export function rekapJenis(
  total: KKBuckets,
  totalJumlah: number,
): RekapItem[] {
  const barangOps = total.barOpsRM + total.barOpsBLU;
  const barangNon = total.barNonRM + total.barNonBLU;
  return [
    { label: "Belanja Pegawai", value: total.pegRM, pct: pctOf(total.pegRM, totalJumlah) },
    { label: "Belanja Barang (Operasional)", value: barangOps, pct: pctOf(barangOps, totalJumlah) },
    { label: "Belanja Barang (Non Operasional)", value: barangNon, pct: pctOf(barangNon, totalJumlah) },
    { label: "Belanja Modal", value: total.modal, pct: pctOf(total.modal, totalJumlah) },
  ];
}

/** Rekap per kategori operasional / non operasional. */
export function rekapKategori(
  total: KKBuckets,
  totalJumlah: number,
): RekapItem[] {
  const ops = total.pegRM + total.barOpsRM + total.barOpsBLU;
  const non = total.barNonRM + total.barNonBLU + total.modal;
  return [
    { label: "Belanja Operasional", value: ops, pct: pctOf(ops, totalJumlah) },
    { label: "Belanja Non Operasional", value: non, pct: pctOf(non, totalJumlah) },
  ];
}

export interface StrukturRekapRow {
  kode: string;
  uraian: string;
  level: string;
  depth: number;
  jumlah: number;
}

export interface RekapAkunRow {
  kode: string;
  uraian: string;
  jenis: string; // Pegawai / Barang / Modal / Lainnya
  value: number;
  pct: number;
}

function jenisFromKode(kode: string): string {
  const d = (kode || "").replace(/\D/g, "");
  if (d.startsWith("51")) return "Pegawai";
  if (d.startsWith("52")) return "Barang";
  if (d.startsWith("53")) return "Modal";
  return "Lainnya";
}

/** Rekap per akun (kode BAS), menjumlahkan seluruh akun dengan kode sama. */
export function rekapAkun(rows: KKRow[], totalJumlah: number): RekapAkunRow[] {
  const map = new Map<string, { uraian: string; value: number }>();
  for (const r of rows) {
    if (r.level !== "AKUN") continue;
    const kode = r.kode || "(tanpa kode)";
    const cur = map.get(kode) ?? { uraian: r.uraian || "", value: 0 };
    cur.value += r.jumlah;
    if (!cur.uraian && r.uraian) cur.uraian = r.uraian;
    map.set(kode, cur);
  }
  return [...map.entries()]
    .map(([kode, v]) => ({
      kode,
      uraian: v.uraian,
      jenis: jenisFromKode(kode),
      value: v.value,
      pct: pctOf(v.value, totalJumlah),
    }))
    .sort((a, b) => a.kode.localeCompare(b.kode));
}

/** Ringkasan struktur tingkat atas (default sampai RO/depth 3). */
export function rekapStruktur(
  rows: KKRow[],
  maxDepth = 3,
): StrukturRekapRow[] {
  return rows
    .filter((r) => r.depth <= maxDepth)
    .map((r) => ({
      kode: r.kode,
      uraian: r.uraian,
      level: r.level,
      depth: r.depth,
      jumlah: r.jumlah,
    }));
}
