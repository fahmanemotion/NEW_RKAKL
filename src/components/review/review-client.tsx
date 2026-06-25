"use client";
import * as React from "react";
import type XLSXTypes from "xlsx-js-style";
import { loadXLSXStyle } from "@/lib/xlsx-lazy";
import { Loader2, Inbox, Download } from "lucide-react";
import { Card, Select, Button, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { fetchAllStruktur } from "@/lib/fetch-struktur";
import { fmtN } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import { STATUS_COLOR, type Status } from "@/lib/constants";
import type { UsulanStruktur } from "@/types/database";
import {
  buildKertasKerja,
  unitKodeFromRows,
  type KKRow,
  type KKBuckets,
} from "@/lib/kertas-kerja";

export interface ReviewUsulan {
  id: string;
  tahun: number;
  tahap: string;
  status: string;
  satkerNama: string;
  satkerKode: string;
}

export function ReviewClient({ usulanList }: { usulanList: ReviewUsulan[] }) {
  const years = React.useMemo(
    () =>
      Array.from(new Set(usulanList.map((u) => u.tahun))).sort((a, b) => b - a),
    [usulanList],
  );
  const [tahun, setTahun] = React.useState<number | null>(years[0] ?? null);

  const tahapList = React.useMemo(
    () => usulanList.filter((u) => u.tahun === tahun),
    [usulanList, tahun],
  );
  const [tahap, setTahap] = React.useState<string | null>(
    tahapList[0]?.tahap ?? null,
  );

  React.useEffect(() => {
    const list = usulanList.filter((u) => u.tahun === tahun);
    setTahap((prev) =>
      list.some((u) => u.tahap === prev) ? prev : (list[0]?.tahap ?? null),
    );
  }, [tahun, usulanList]);

  const usulan = React.useMemo(
    () => usulanList.find((u) => u.tahun === tahun && u.tahap === tahap) ?? null,
    [usulanList, tahun, tahap],
  );

  const [rows, setRows] = React.useState<UsulanStruktur[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!usulan) {
      setRows([]);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchAllStruktur(createClient(), usulan.id)
      .then((data) => {
        if (!alive) return;
        setRows(data as UsulanStruktur[]);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [usulan]);

  const kk = React.useMemo(() => buildKertasKerja(rows), [rows]);

  async function download() {
    if (!usulan) return;
    const XLSX = await loadXLSXStyle();
    const tahapLabel = TAHAP_LABEL[usulan.tahap as TahapPagu] ?? usulan.tahap;
    const unitKode = unitKodeFromRows(kk.rows);
    const wb = buildWorkbook(XLSX, kk.rows, kk.total, kk.totalJumlah, {
      tahun: usulan.tahun,
      tahapLabel,
      satkerNama: usulan.satkerNama,
      unitKode,
    });
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kertas_Kerja_${usulan.satkerKode || "Satker"}_${tahapLabel.replace(/\s+/g, "_")}_TA${usulan.tahun}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const noData = usulanList.length === 0;

  return (
    <div className="space-y-6">
      {/* Header + pemilih (sama seperti dashboard) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Review Kertas Kerja</h1>
          <p className="text-sm text-muted-foreground">
            Tinjau kertas kerja yang telah disusun, lalu unduh bila perlu.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Tahun Anggaran
            </label>
            <Select
              value={tahun ?? ""}
              onChange={(e) => setTahun(Number(e.target.value))}
              disabled={years.length === 0}
              className="min-w-[120px]"
            >
              {years.length === 0 && <option value="">—</option>}
              {years.map((y) => (
                <option key={y} value={y}>
                  TA {y}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Tahap Pagu
            </label>
            <Select
              value={tahap ?? ""}
              onChange={(e) => setTahap(e.target.value)}
              disabled={tahapList.length === 0}
              className="min-w-[190px]"
            >
              {tahapList.length === 0 && <option value="">—</option>}
              {tahapList.map((u) => (
                <option key={u.id} value={u.tahap}>
                  {TAHAP_LABEL[u.tahap as TahapPagu] ?? u.tahap} · {u.status}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={download} disabled={!usulan || kk.rows.length === 0}>
            <Download className="size-4" /> Unduh Kertas Kerja
          </Button>
        </div>
      </div>

      {noData ? (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada kertas kerja yang dapat direview.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Kop kertas kerja */}
          {usulan && (
            <div className="border-b border-border p-4 text-center">
              <div className="text-sm font-bold uppercase">
                Rincian Kertas Kerja Satker — {usulan.satkerNama}
              </div>
              <div className="text-xs text-muted-foreground">
                {TAHAP_LABEL[usulan.tahap as TahapPagu] ?? usulan.tahap} · T.A.{" "}
                {usulan.tahun}
                <Badge
                  className={`ml-2 ${STATUS_COLOR[usulan.status as Status] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {usulan.status}
                </Badge>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">
                    Kode / Program / Kegiatan / KRO / RO / Komponen / SubKomp /
                    Detil
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">Volume</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Harga Satuan
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Jumlah Biaya
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">SD</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : kk.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      <Inbox className="mx-auto mb-2 size-6" />
                      Tahap ini belum memiliki rincian kertas kerja.
                    </td>
                  </tr>
                ) : (
                  kk.rows.map((r) => <KKRowView key={r.id} r={r} />)
                )}
              </tbody>
              {kk.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold">
                    <td className="px-3 py-2">JUMLAH</td>
                    <td></td>
                    <td></td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {fmtN(kk.totalJumlah)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function KKRowView({ r }: { r: KKRow }) {
  const heavy = r.level === "PROGRAM" || r.level === "KEGIATAN";
  const isStruct =
    r.level !== "DETAIL" && r.level !== "AKUN" && r.level !== "SUB_KOMPONEN";
  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/30">
      <td className="px-3 py-1.5">
        <div
          className={`${heavy ? "font-bold" : isStruct ? "font-medium" : ""}`}
          style={{ paddingLeft: r.depth * 12 }}
        >
          {r.kode && (
            <span className="mr-1 font-mono text-muted-foreground">
              {r.kode}
            </span>
          )}
          {r.isDetail ? "- " : ""}
          {r.uraian}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
        {r.segments && r.segments.length > 1 ? (
          <div className="flex flex-col items-end">
            <span className="text-[11px] text-muted-foreground">
              {r.segments.map((s) => `${fmtN(s.qty)} ${s.sat}`).join(" × ")}
            </span>
            <span>
              {fmtN(r.vol)} {r.satuan ?? ""}
            </span>
          </div>
        ) : r.vol != null ? (
          `${fmtN(r.vol)} ${r.satuan ?? ""}`
        ) : (
          ""
        )}
      </td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
        {r.harga != null && r.harga > 0 ? fmtN(r.harga) : ""}
      </td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
        {r.jumlah ? fmtN(r.jumlah) : ""}
      </td>
      <td className="px-3 py-1.5 text-center">
        {r.sumber && r.sumber !== "-" ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
              r.sumber === "BLU"
                ? "bg-violet-100 text-violet-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {r.sumber}
          </span>
        ) : (
          ""
        )}
      </td>
    </tr>
  );
}

/* ── Ekspor XLSX (format Komposisi Anggaran, seperti file contoh) ──────────── */

// Indeks kolom (0-based): B=1 … AG=32
const C = {
  KODE: 1,
  URAIAN: 2,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  VOL: 18,
  SATUAN: 19,
  HARGA: 20,
  JUMLAH: 21,
  PEG_RM: 22, // W
  BAR_OPS_RM: 23, // X
  BAR_OPS_BLU: 24, // Y
  BAR_NON_RM: 25, // Z
  BAR_NON_BLU: 26, // AA
  MODAL: 27, // AB
  SUM_RM: 28, // AC
  SUM_BLU: 29, // AD
  SUM_SBSN: 30, // AE
  JUMLAH_RAYA: 31, // AF
  SUMBER: 32, // AG
};

// Kolom qty/satuan/pemisah untuk hingga 5 segmen volume (area "Detail" E–R).
const QTY_COLS = [C.E, C.H, C.K, C.N, C.Q]; // E,H,K,N,Q
const SAT_COLS = [C.F, C.I, C.L, C.O, C.R]; // F,I,L,O,R
const SEP_COLS = [C.G, C.J, C.M, C.P]; // pemisah "x" antar segmen

function emptyRow(): (string | number | null)[] {
  return new Array(33).fill(null);
}

// Warna latar per level hierarki (RGB hex, tanpa alfa).
const LEVEL_FILL: Record<string, string> = {
  UNIT: "1F3864", // biru tua
  PROGRAM: "2E75B6", // biru
  KEGIATAN: "9DC3E6", // biru muda
  KRO: "70AD47", // hijau
  RO: "C6E0B4", // hijau muda
  KOMPONEN: "FFD966", // kuning
  SUB_KOMPONEN: "F4B183", // oranye muda
  AKUN: "D9D9D9", // abu
  DETAIL: "FFFFFF", // putih
};
const LEVEL_WHITE_FONT: Record<string, boolean> = {
  UNIT: true,
  PROGRAM: true,
  KRO: true,
};

const THIN = { style: "thin", color: { rgb: "9CA3AF" } };
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function buildWorkbook(
  XLSX: XLSXTypes,
  kkRows: KKRow[],
  total: KKBuckets,
  totalJumlah: number,
  header: {
    tahun: number;
    tahapLabel: string;
    satkerNama: string;
    unitKode: string;
  },
) {
  const aoa: (string | number | null)[][] = [];

  // Judul
  let r = emptyRow();
  r[C.KODE] = `KOMPOSISI ANGGARAN ${header.tahapLabel.toUpperCase()}`;
  aoa.push(r);
  r = emptyRow();
  r[C.KODE] = header.satkerNama.toUpperCase();
  aoa.push(r);
  r = emptyRow();
  r[C.KODE] = `T.A ${header.tahun}`;
  aoa.push(r);
  aoa.push(emptyRow());

  // Header tabel (baris 5–8)
  r = emptyRow();
  r[C.KODE] = "KODE";
  r[C.URAIAN] = "URAIAN";
  r[C.E] = "Detail";
  r[C.VOL] = "Vol";
  r[C.SATUAN] = "Satuan";
  r[C.HARGA] = "Harga";
  r[C.JUMLAH] = "Jumlah";
  r[C.PEG_RM] = "Belanja Operasional";
  r[C.BAR_NON_RM] = "Belanja Non Operasional";
  r[C.SUM_RM] = "Sumber Dana";
  r[C.JUMLAH_RAYA] = "Jumlah Raya";
  r[C.SUMBER] = "Sumber Dana";
  aoa.push(r);

  r = emptyRow();
  r[C.PEG_RM] = "Pegawai";
  r[C.BAR_OPS_RM] = "Barang";
  r[C.BAR_NON_RM] = "Barang";
  r[C.MODAL] = "Modal";
  aoa.push(r);

  r = emptyRow();
  r[C.E] = 1; r[C.F] = "sat"; r[C.G] = "x";
  r[C.H] = 2; r[C.I] = "sat"; r[C.J] = "x";
  r[C.K] = 3; r[C.L] = "sat"; r[C.M] = "x";
  r[C.N] = 4; r[C.O] = "sat"; r[C.P] = "x";
  r[C.Q] = 5; r[C.R] = "sat";
  r[C.PEG_RM] = "RM"; r[C.BAR_OPS_RM] = "RM"; r[C.BAR_OPS_BLU] = "BLU";
  r[C.BAR_NON_RM] = "RM"; r[C.BAR_NON_BLU] = "BLU"; r[C.MODAL] = "SBSN";
  r[C.SUM_RM] = "RM"; r[C.SUM_BLU] = "BLU"; r[C.SUM_SBSN] = "SBSN";
  aoa.push(r);

  r = emptyRow();
  r[C.KODE] = "a"; r[C.URAIAN] = "b"; r[3] = "c"; r[C.E] = "e"; r[C.H] = "f";
  r[C.K] = "g"; r[C.N] = "h"; r[C.Q] = "i"; r[C.VOL] = "j"; r[C.SATUAN] = "k";
  r[C.HARGA] = "l"; r[C.JUMLAH] = "m"; r[C.PEG_RM] = "n"; r[C.BAR_OPS_RM] = "o";
  r[C.BAR_OPS_BLU] = "p"; r[C.BAR_NON_RM] = "q"; r[C.BAR_NON_BLU] = "r";
  r[C.SUM_RM] = "s"; r[C.SUM_BLU] = "t"; r[C.JUMLAH_RAYA] = "u"; r[C.SUMBER] = "v";
  aoa.push(r);

  // Baris total unit (mis. 022.12) — excel row 9
  r = emptyRow();
  r[C.KODE] = header.unitKode;
  r[C.URAIAN] = header.satkerNama;
  fillNumbers(r, total, totalJumlah);
  aoa.push(r);

  // Baris data — mulai excel row 10
  const DATA_START = 10; // 1-based
  const idToRow = new Map<string, number>();
  kkRows.forEach((k, i) => idToRow.set(k.id, DATA_START + i));

  for (const k of kkRows) {
    r = emptyRow();
    if (!k.isDetail) r[C.KODE] = k.kode;
    r[C.URAIAN] = (k.isDetail ? "- " : "") + k.uraian;
    if (k.vol != null) {
      r[C.VOL] = k.vol;
      r[C.SATUAN] = k.satuan ?? null;
    }
    if (k.harga != null && k.harga > 0) r[C.HARGA] = k.harga;
    // Rincian volume bertingkat → kolom E–R (maks 5 segmen).
    const segs = (k.segments ?? []).slice(0, 5);
    segs.forEach((s, i) => {
      r[QTY_COLS[i]] = s.qty;
      r[SAT_COLS[i]] = s.sat;
      if (i < segs.length - 1 && i < SEP_COLS.length) r[SEP_COLS[i]] = "x";
    });
    fillNumbers(r, k.buckets, k.jumlah);
    if (k.level === "AKUN" && k.sumber && k.sumber !== "-")
      r[C.SUMBER] = k.sumber;
    aoa.push(r);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── Rumus (live) ──────────────────────────────────────────────────────────
  const NUM_COLS = [
    C.JUMLAH, C.PEG_RM, C.BAR_OPS_RM, C.BAR_OPS_BLU, C.BAR_NON_RM,
    C.BAR_NON_BLU, C.MODAL, C.SUM_RM, C.SUM_BLU, C.SUM_SBSN, C.JUMLAH_RAYA,
  ];
  const ref = (row1: number, col0: number) =>
    XLSX.utils.encode_cell({ r: row1 - 1, c: col0 });
  const colLetter = (c: number) => XLSX.utils.encode_col(c);
  const setF = (row1: number, col0: number, f: string, v: number) => {
    const a = ref(row1, col0);
    ws[a] = { ...(ws[a] || {}), t: "n", f, v };
  };

  // bucket key → kolom (untuk detail)
  const bucketCol: Record<string, number> = {
    pegRM: C.PEG_RM, barOpsRM: C.BAR_OPS_RM, barOpsBLU: C.BAR_OPS_BLU,
    barNonRM: C.BAR_NON_RM, barNonBLU: C.BAR_NON_BLU, modal: C.MODAL,
  };
  const sumberCol: Record<string, number> = {
    rm: C.SUM_RM, blu: C.SUM_BLU, sbsn: C.SUM_SBSN,
  };

  // anak langsung tiap node
  const childrenRows = new Map<string, number[]>();
  for (const k of kkRows) {
    if (k.parentId) {
      const arr = childrenRows.get(k.parentId) ?? [];
      arr.push(idToRow.get(k.id)!);
      childrenRows.set(k.parentId, arr);
    }
  }
  // anak langsung untuk baris unit = semua PROGRAM (top-level)
  const programRows = kkRows
    .filter((k) => k.parentId == null || !idToRow.has(k.parentId))
    .map((k) => idToRow.get(k.id)!);

  for (const k of kkRows) {
    const row1 = idToRow.get(k.id)!;
    if (k.isDetail) {
      const hasCalc =
        k.vol != null && k.vol > 0 && k.harga != null && k.harga > 0;
      // Vol (S) = hasil kali segmen bila ada rincian bertingkat (≥2 segmen).
      const segs = (k.segments ?? []).slice(0, 5);
      if (segs.length >= 2) {
        const qtyRefs = segs.map(
          (_, i) => `${colLetter(QTY_COLS[i])}${row1}`,
        );
        setF(row1, C.VOL, `=${qtyRefs.join("*")}`, k.vol ?? 0);
      }
      if (hasCalc) {
        setF(
          row1,
          C.JUMLAH,
          `${colLetter(C.VOL)}${row1}*${colLetter(C.HARGA)}${row1}`,
          k.jumlah,
        );
      } else {
        ws[ref(row1, C.JUMLAH)] = { t: "n", v: k.jumlah };
      }
      const vRef = `${colLetter(C.JUMLAH)}${row1}`;
      const bk = (Object.keys(bucketCol) as (keyof KKBuckets)[]).find(
        (key) => k.buckets[key] > 0,
      );
      if (bk) setF(row1, bucketCol[bk], `=${vRef}`, k.buckets[bk]);
      const sk = (["rm", "blu", "sbsn"] as (keyof KKBuckets)[]).find(
        (key) => k.buckets[key] > 0,
      );
      if (sk) setF(row1, sumberCol[sk], `=${vRef}`, k.buckets[sk]);
      setF(row1, C.JUMLAH_RAYA, `=${vRef}`, k.jumlah);
    } else {
      const kids = childrenRows.get(k.id) ?? [];
      if (kids.length) {
        for (const col of NUM_COLS) {
          const cl = colLetter(col);
          const f = kids.map((cr) => `${cl}${cr}`).join("+");
          // nilai cache
          let v = 0;
          if (col === C.JUMLAH || col === C.JUMLAH_RAYA) v = k.jumlah;
          else if (col === C.PEG_RM) v = k.buckets.pegRM;
          else if (col === C.BAR_OPS_RM) v = k.buckets.barOpsRM;
          else if (col === C.BAR_OPS_BLU) v = k.buckets.barOpsBLU;
          else if (col === C.BAR_NON_RM) v = k.buckets.barNonRM;
          else if (col === C.BAR_NON_BLU) v = k.buckets.barNonBLU;
          else if (col === C.MODAL) v = k.buckets.modal;
          else if (col === C.SUM_RM) v = k.buckets.rm;
          else if (col === C.SUM_BLU) v = k.buckets.blu;
          else if (col === C.SUM_SBSN) v = k.buckets.sbsn;
          setF(row1, col, `=${f}`, v);
        }
      }
    }
  }

  // baris unit (row 9) = jumlah semua program
  if (programRows.length) {
    for (const col of NUM_COLS) {
      const cl = colLetter(col);
      const f = programRows.map((cr) => `${cl}${cr}`).join("+");
      let v = 0;
      if (col === C.JUMLAH || col === C.JUMLAH_RAYA) v = totalJumlah;
      else if (col === C.PEG_RM) v = total.pegRM;
      else if (col === C.BAR_OPS_RM) v = total.barOpsRM;
      else if (col === C.BAR_OPS_BLU) v = total.barOpsBLU;
      else if (col === C.BAR_NON_RM) v = total.barNonRM;
      else if (col === C.BAR_NON_BLU) v = total.barNonBLU;
      else if (col === C.MODAL) v = total.modal;
      else if (col === C.SUM_RM) v = total.rm;
      else if (col === C.SUM_BLU) v = total.blu;
      else if (col === C.SUM_SBSN) v = total.sbsn;
      setF(9, col, `=${f}`, v);
    }
  }

  // ── Gaya (warna per level + border) ──────────────────────────────────────
  // Judul
  for (let i = 0; i < 3; i++) {
    const a = ref(i + 1, C.KODE);
    ws[a] = ws[a] || { t: "s", v: "" };
    ws[a].s = { font: { bold: true, sz: i === 0 ? 12 : 10 } };
  }
  // Header tabel (baris 5–8)
  for (let row1 = 5; row1 <= 8; row1++) {
    for (let c = 1; c <= 32; c++) {
      const a = ref(row1, c);
      ws[a] = ws[a] || { t: "s", v: "" };
      ws[a].s = {
        font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "44546A" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: ALL_BORDERS,
      };
    }
  }
  // Baris unit (9)
  styleDataRow(ws, ref, 9, "UNIT");
  // Baris data
  kkRows.forEach((k, i) => styleDataRow(ws, ref, DATA_START + i, k.level));

  // Merges + lebar kolom (sama seperti sebelumnya)
  const m = (sr: number, sc: number, er: number, ec: number) => ({
    s: { r: sr, c: sc },
    e: { r: er, c: ec },
  });
  ws["!merges"] = [
    m(0, 1, 0, 32), m(1, 1, 1, 32), m(2, 1, 2, 32),
    m(4, 1, 6, 1), m(4, 2, 6, 3), m(4, 4, 5, 17), m(4, 18, 6, 18),
    m(4, 19, 6, 19), m(4, 20, 6, 20), m(4, 21, 6, 21), m(4, 22, 4, 24),
    m(4, 25, 4, 27), m(4, 28, 5, 30), m(4, 31, 6, 31), m(4, 32, 6, 32),
    m(5, 23, 5, 24), m(5, 25, 5, 26), m(6, 4, 6, 6), m(6, 7, 6, 9),
    m(6, 10, 6, 12), m(6, 13, 6, 15), m(6, 16, 6, 17),
  ];
  const widths: Record<number, number> = {
    0: 5.2, 1: 13.5, 2: 40, 3: 3.7, 4: 4.3, 5: 5.3, 6: 1.8, 7: 4.2,
    8: 8.5, 9: 1.8, 10: 3.7, 11: 8.7, 12: 1.8, 13: 4.7, 14: 6.7, 15: 1.8,
    16: 2.7, 17: 8.7, 18: 6.2, 19: 8.7, 20: 14.3, 21: 14, 22: 14,
    23: 12, 24: 13, 25: 12, 26: 16, 27: 12, 28: 12, 29: 12,
    30: 12, 31: 14, 32: 9.5,
  };
  ws["!cols"] = Array.from({ length: 33 }, (_, i) => ({ wch: widths[i] ?? 10 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DETAIL");
  return wb;
}

function fillNumbers(
  row: (string | number | null)[],
  b: KKBuckets,
  jumlah: number,
) {
  row[C.JUMLAH] = jumlah || null;
  row[C.PEG_RM] = b.pegRM || null;
  row[C.BAR_OPS_RM] = b.barOpsRM || null;
  row[C.BAR_OPS_BLU] = b.barOpsBLU || null;
  row[C.BAR_NON_RM] = b.barNonRM || null;
  row[C.BAR_NON_BLU] = b.barNonBLU || null;
  row[C.MODAL] = b.modal || null;
  row[C.SUM_RM] = b.rm || null;
  row[C.SUM_BLU] = b.blu || null;
  row[C.SUM_SBSN] = b.sbsn || null;
  row[C.JUMLAH_RAYA] = jumlah || null;
}

function styleDataRow(
  ws: Record<string, any>,
  ref: (row1: number, col0: number) => string,
  row1: number,
  level: string,
) {
  const fill = LEVEL_FILL[level] ?? "FFFFFF";
  const white = LEVEL_WHITE_FONT[level] ?? false;
  const bold =
    level !== "DETAIL" && level !== "AKUN" ? true : level === "AKUN";
  // Format yang menyembunyikan nilai 0 (bagian ketiga kosong): sel tetap berisi
  // ANGKA 0 sehingga rumus penjumlahan tidak menghasilkan #VALUE!, namun tampil
  // kosong di layar.
  const moneyFmt = "#,##0;-#,##0;";
  const volFmt = "#,##0.##;-#,##0.##;";
  for (let c = 1; c <= 32; c++) {
    const a = ref(row1, c);
    const isNum = c >= 18 && c !== 19; // angka: Vol(18), Harga(20), Jumlah(21), bucket/sumber/AF(22..31)
    if (!ws[a]) {
      // Sel kosong di kolom angka → angka 0 (bukan teks ""), agar aman saat
      // dijumlahkan oleh rumus induk. Kolom non-angka tetap teks kosong.
      ws[a] = isNum ? { t: "n", v: 0 } : { t: "s", v: "" };
    }
    ws[a].s = {
      font: {
        sz: 9,
        bold,
        color: { rgb: white ? "FFFFFF" : "000000" },
      },
      fill: { patternType: "solid", fgColor: { rgb: fill } },
      alignment: {
        horizontal: c === 2 ? "left" : isNum ? "right" : "center",
        vertical: "center",
      },
      border: ALL_BORDERS,
      numFmt: c === 18 ? volFmt : isNum ? moneyFmt : undefined,
    };
  }
}
