// SIPPT — transformasi data untuk Dashboard.
// Murni & bebas framework: mengubah daftar usulan_struktur menjadi baris
// tingkat-AKUN (beserta rincian DETAIL-nya) yang siap ditampilkan di tabel
// "Daftar Usulan Kegiatan" ala SIPADU.

import type { UsulanStruktur } from "@/types/database";

export interface DashDetailRow {
  id: string;
  uraian: string;
  pagu: number;
  sumber: string; // RM / BLU / SBSN / -
  kategori: string; // OPS / NON / -
  volume: number | null;
  satuan: string | null;
  harga: number | null;
}

export interface DashAkunRow {
  id: string;
  kode: string; // gabungan kode prog.keg.kro.ro.akun
  akunKode: string;
  akunUraian: string;
  context: string; // baris kecil: prog • keg • kro • ro
  progKode: string;
  kegKode: string;
  kroKode: string;
  roKode: string;
  pagu: number;
  jenisBelanja: string; // PEGAWAI / BARANG / MODAL / LAINNYA (dari prefiks kode akun)
  sumberSet: string[]; // mis. ['RM'] atau ['RM','BLU']
  kategoriSet: string[]; // mis. ['OPS'] / ['NON'] / keduanya
  details: DashDetailRow[];
}

/** Normalisasi sumber dana ke label ringkas RM / BLU / SBSN. */
export function normSumber(s: string | null | undefined): string {
  const v = (s || "").toUpperCase();
  if (v.includes("BLU")) return "BLU";
  if (v.includes("SBSN")) return "SBSN";
  if (v.includes("RM") || v.includes("RUPIAH")) return "RM";
  return v || "-";
}

/** Normalisasi jenis belanja ke OPS / NON. */
export function normKategori(j: string | null | undefined): string {
  const v = (j || "").toUpperCase();
  if (v.startsWith("NON")) return "NON";
  if (v === "OPS" || v.startsWith("OPER")) return "OPS";
  return v ? v : "-";
}

/**
 * Jenis belanja dari prefiks kode akun sesuai BAS:
 *   51x → Belanja Pegawai, 52x → Belanja Barang, 53x → Belanja Modal.
 */
export function jenisBelanjaFromKode(kode: string | null | undefined): string {
  const k = (kode || "").replace(/\D/g, "");
  if (k.startsWith("51")) return "PEGAWAI";
  if (k.startsWith("52")) return "BARANG";
  if (k.startsWith("53")) return "MODAL";
  return "LAINNYA";
}

/** Peta label kode→uraian per level (untuk isi dropdown filter). */
export function levelLabelMaps(rows: UsulanStruktur[]) {
  const make = (lvl: string) => {
    const m = new Map<string, string>();
    rows
      .filter((r) => r.level === lvl && r.kode)
      .forEach((r) => m.set(r.kode as string, r.uraian ?? ""));
    return m;
  };
  return {
    PROGRAM: make("PROGRAM"),
    KEGIATAN: make("KEGIATAN"),
    KRO: make("KRO"),
    RO: make("RO"),
    AKUN: make("AKUN"),
  };
}

/** Bangun daftar baris tingkat AKUN beserta rincian DETAIL-nya. */
export function buildDashboardRows(rows: UsulanStruktur[]): DashAkunRow[] {
  const byId = new Map<string, UsulanStruktur>();
  rows.forEach((r) => byId.set(r.id, r));

  const childrenOf = new Map<string, UsulanStruktur[]>();
  rows.forEach((r) => {
    const key = r.parent_id ?? "__root__";
    const arr = childrenOf.get(key);
    if (arr) arr.push(r);
    else childrenOf.set(key, [r]);
  });

  // Telusuri ke atas mencari kode leluhur pada level tertentu.
  const ancestorKode = (node: UsulanStruktur, level: string): string => {
    let cur: UsulanStruktur | undefined = node;
    while (cur) {
      if (cur.level === level) return cur.kode ?? "";
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return "";
  };

  const out: DashAkunRow[] = [];
  rows
    .filter((r) => r.level === "AKUN")
    .forEach((a) => {
      const details = (childrenOf.get(a.id) ?? []).filter(
        (c) => c.level === "DETAIL",
      );
      const detailRows: DashDetailRow[] = details
        .slice()
        .sort((x, y) => x.urutan - y.urutan)
        .map((d) => ({
          id: d.id,
          uraian: d.uraian ?? "",
          pagu: Number(d.jumlah) || 0,
          sumber: normSumber(d.sumber_dana ?? a.sumber_dana),
          kategori: normKategori(d.jenis_belanja),
          volume: d.volume,
          satuan: d.satuan,
          harga: d.harga,
        }));

      const pagu =
        detailRows.reduce((s, d) => s + d.pagu, 0) || Number(a.jumlah) || 0;

      const sumberSet = Array.from(
        new Set(detailRows.map((d) => d.sumber).filter((x) => x && x !== "-")),
      );
      if (sumberSet.length === 0) {
        const s = normSumber(a.sumber_dana);
        if (s && s !== "-") sumberSet.push(s);
      }

      const kategoriSet = Array.from(
        new Set(detailRows.map((d) => d.kategori).filter((x) => x && x !== "-")),
      );

      const progKode = ancestorKode(a, "PROGRAM");
      const kegKode = ancestorKode(a, "KEGIATAN");
      const kroKode = ancestorKode(a, "KRO");
      const roKode = ancestorKode(a, "RO");
      const kode = [progKode, kegKode, kroKode, roKode, a.kode ?? ""]
        .filter(Boolean)
        .join(".");

      out.push({
        id: a.id,
        kode,
        akunKode: a.kode ?? "",
        akunUraian: a.uraian ?? "",
        context: [progKode, kegKode, kroKode, roKode].filter(Boolean).join(" • "),
        progKode,
        kegKode,
        kroKode,
        roKode,
        pagu,
        jenisBelanja: jenisBelanjaFromKode(a.kode),
        sumberSet,
        kategoriSet,
        details: detailRows,
      });
    });

  out.sort((x, y) => x.kode.localeCompare(y.kode));
  return out;
}

export interface DashSummary {
  total: number;
  ops: number;
  non: number;
  rm: number;
  blu: number;
  pegawai: number;
  barang: number;
  modal: number;
  akunCount: number;
}

/** Ringkasan nilai dari daftar baris akun yang sudah terfilter. */
export function summarize(rows: DashAkunRow[]): DashSummary {
  const s: DashSummary = {
    total: 0,
    ops: 0,
    non: 0,
    rm: 0,
    blu: 0,
    pegawai: 0,
    barang: 0,
    modal: 0,
    akunCount: rows.length,
  };
  rows.forEach((a) => {
    a.details.forEach((d) => {
      s.total += d.pagu;
      if (d.kategori === "OPS") s.ops += d.pagu;
      else if (d.kategori === "NON") s.non += d.pagu;
      if (d.sumber === "RM") s.rm += d.pagu;
      else if (d.sumber === "BLU") s.blu += d.pagu;
    });
    // Bila akun tak punya detail, hitung pagu akun ke total saja.
    if (a.details.length === 0) s.total += a.pagu;

    // Bucket jenis belanja berdasarkan kode akun (pakai pagu akun).
    if (a.jenisBelanja === "PEGAWAI") s.pegawai += a.pagu;
    else if (a.jenisBelanja === "BARANG") s.barang += a.pagu;
    else if (a.jenisBelanja === "MODAL") s.modal += a.pagu;
  });
  return s;
}
