// SIPPT — penyusun "Kertas Kerja" dari usulan_struktur.
// Murni & bebas framework: menghasilkan baris hierarki (Program→…→Detail) lengkap
// dengan agregasi nilai per kategori (OPS/NON), jenis belanja (Pegawai/Barang/
// Modal), dan sumber dana (RM/BLU/SBSN). Dipakai untuk tampilan review (format
// seperti Rincian Kertas Kerja Satker) sekaligus ekspor XLSX (Komposisi Anggaran).

import type { UsulanStruktur } from "@/types/database";

// Helper kecil (disalin agar modul ini bebas dependensi runtime & mudah diuji).
function normSumber(s: string | null | undefined): string {
  const v = (s || "").toUpperCase();
  if (v.includes("BLU")) return "BLU";
  if (v.includes("SBSN")) return "SBSN";
  if (v.includes("RM") || v.includes("RUPIAH")) return "RM";
  return v || "-";
}
function normKategori(j: string | null | undefined): string {
  const v = (j || "").toUpperCase();
  if (v.startsWith("NON")) return "NON";
  if (v === "OPS" || v.startsWith("OPER")) return "OPS";
  return v ? v : "-";
}
function jenisBelanjaFromKode(kode: string | null | undefined): string {
  const k = (kode || "").replace(/\D/g, "");
  if (k.startsWith("51")) return "PEGAWAI";
  if (k.startsWith("52")) return "BARANG";
  if (k.startsWith("53")) return "MODAL";
  return "LAINNYA";
}

export interface KKBuckets {
  pegRM: number; // Operasional · Pegawai (RM)
  barOpsRM: number; // Operasional · Barang (RM)
  barOpsBLU: number; // Operasional · Barang (BLU)
  barNonRM: number; // Non Operasional · Barang (RM)
  barNonBLU: number; // Non Operasional · Barang (BLU)
  modal: number; // Belanja Modal
  rm: number; // Sumber RM
  blu: number; // Sumber BLU
  sbsn: number; // Sumber SBSN
}

export interface KKRow {
  id: string;
  parentId: string | null;
  level: string;
  depth: number;
  kode: string;
  uraian: string;
  vol: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  sumber: string; // label RM/BLU/SBSN (untuk baris AKUN) — selain itu ''
  buckets: KKBuckets;
  isDetail: boolean;
  segments: { qty: number; sat: string }[] | null; // rincian volume bertingkat (DETAIL)
}

const DEPTH: Record<string, number> = {
  PROGRAM: 0,
  KEGIATAN: 1,
  KRO: 2,
  RO: 3,
  KOMPONEN: 4,
  SUB_KOMPONEN: 5,
  AKUN: 6,
  DETAIL: 7,
};

const zero = (): KKBuckets => ({
  pegRM: 0,
  barOpsRM: 0,
  barOpsBLU: 0,
  barNonRM: 0,
  barNonBLU: 0,
  modal: 0,
  rm: 0,
  blu: 0,
  sbsn: 0,
});

function addInto(a: KKBuckets, b: KKBuckets) {
  a.pegRM += b.pegRM;
  a.barOpsRM += b.barOpsRM;
  a.barOpsBLU += b.barOpsBLU;
  a.barNonRM += b.barNonRM;
  a.barNonBLU += b.barNonBLU;
  a.modal += b.modal;
  a.rm += b.rm;
  a.blu += b.blu;
  a.sbsn += b.sbsn;
}

/** Klasifikasi satu DETAIL ke bucket berdasarkan akun, kategori, dan sumber. */
export function detailBuckets(
  jumlah: number,
  sumberDana: string | null | undefined,
  jenisBelanja: string | null | undefined,
  akunKode: string,
): KKBuckets {
  const b = zero();
  const j = Number(jumlah) || 0;
  const sumber = normSumber(sumberDana);
  const kat = normKategori(jenisBelanja);
  const jenis = jenisBelanjaFromKode(akunKode);

  // Sumber dana
  if (sumber === "BLU") b.blu += j;
  else if (sumber === "SBSN") b.sbsn += j;
  else b.rm += j; // default RM

  // OPS/NON × jenis belanja
  if (jenis === "PEGAWAI") {
    b.pegRM += j;
  } else if (jenis === "MODAL") {
    b.modal += j;
  } else {
    // BARANG (dan lainnya diperlakukan sebagai barang)
    if (kat === "NON") {
      if (sumber === "BLU") b.barNonBLU += j;
      else b.barNonRM += j;
    } else {
      if (sumber === "BLU") b.barOpsBLU += j;
      else b.barOpsRM += j;
    }
  }
  return b;
}

interface Node extends UsulanStruktur {
  children: Node[];
  _b?: KKBuckets;
  _j?: number;
}

/** Bangun daftar baris kertas kerja terurut + total keseluruhan. */
export function buildKertasKerja(rows: UsulanStruktur[]): {
  rows: KKRow[];
  total: KKBuckets;
  totalJumlah: number;
} {
  const byId = new Map<string, Node>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: Node[] = [];
  byId.forEach((n) => {
    if (n.parent_id && byId.has(n.parent_id))
      byId.get(n.parent_id)!.children.push(n);
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

  const akunKodeOf = (n: Node): string => {
    let cur: Node | undefined = n;
    while (cur) {
      if (cur.level === "AKUN") return cur.kode || "";
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return "";
  };

  // Pass 1: agregasi bucket & jumlah (post-order).
  const compute = (n: Node): { b: KKBuckets; j: number } => {
    if (n.level === "DETAIL") {
      const b = detailBuckets(
        Number(n.jumlah) || 0,
        n.sumber_dana,
        n.jenis_belanja,
        akunKodeOf(n),
      );
      n._b = b;
      n._j = Number(n.jumlah) || 0;
      return { b, j: n._j };
    }
    const b = zero();
    let j = 0;
    n.children.forEach((c) => {
      const r = compute(c);
      addInto(b, r.b);
      j += r.j;
    });
    n._b = b;
    n._j = j;
    return { b, j };
  };

  const total = zero();
  let totalJumlah = 0;
  roots.forEach((r) => {
    const res = compute(r);
    addInto(total, res.b);
    totalJumlah += res.j;
  });

  // Pass 2: ratakan (pre-order).
  const out: KKRow[] = [];
  const emit = (n: Node) => {
    const isDetail = n.level === "DETAIL";
    out.push({
      id: n.id,
      parentId: n.parent_id ?? null,
      level: n.level,
      depth: DEPTH[n.level] ?? 0,
      kode: n.kode || "",
      uraian: n.uraian || "",
      vol:
        isDetail || n.level === "KRO" || n.level === "RO" ? n.volume : null,
      satuan:
        isDetail || n.level === "KRO" || n.level === "RO" ? n.satuan : null,
      harga: isDetail ? n.harga : null,
      jumlah: n._j ?? 0,
      sumber: n.level === "AKUN" ? normSumber(n.sumber_dana) : "",
      buckets: n._b ?? zero(),
      isDetail,
      segments: isDetail
        ? ((n as { volume_rincian?: { qty: number; sat: string }[] | null })
            .volume_rincian ?? null)
        : null,
    });
    if (!isDetail) n.children.forEach(emit);
  };
  roots.forEach(emit);

  return { rows: out, total, totalJumlah };
}

/** Kode unit (mis. "022.12") diturunkan dari kode program pertama. */
export function unitKodeFromRows(rows: KKRow[]): string {
  const prog = rows.find((r) => r.level === "PROGRAM");
  if (!prog) return "";
  const parts = prog.kode.split(".");
  return parts.slice(0, 2).join(".");
}
