"use client";
import * as React from "react";
import * as XLSX from "xlsx";
import { Loader2, Inbox, Download } from "lucide-react";
import { Card, Select, Button, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase";
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
    createClient()
      .from("usulan_struktur")
      .select("*")
      .eq("usulan_id", usulan.id)
      .order("urutan", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setRows((data ?? []) as UsulanStruktur[]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [usulan]);

  const kk = React.useMemo(() => buildKertasKerja(rows), [rows]);

  function download() {
    if (!usulan) return;
    const tahapLabel = TAHAP_LABEL[usulan.tahap as TahapPagu] ?? usulan.tahap;
    const unitKode = unitKodeFromRows(kk.rows);
    const wb = buildWorkbook(kk.rows, kk.total, kk.totalJumlah, {
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
        {r.vol != null ? `${fmtN(r.vol)} ${r.satuan ?? ""}` : ""}
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

function emptyRow(): (string | number | null)[] {
  return new Array(33).fill(null);
}

function bucketsToRow(
  row: (string | number | null)[],
  b: KKBuckets,
  jumlah: number,
) {
  row[C.JUMLAH] = jumlah;
  row[C.PEG_RM] = b.pegRM || null;
  row[C.BAR_OPS_RM] = b.barOpsRM || null;
  row[C.BAR_OPS_BLU] = b.barOpsBLU || null;
  row[C.BAR_NON_RM] = b.barNonRM || null;
  row[C.BAR_NON_BLU] = b.barNonBLU || null;
  row[C.MODAL] = b.modal || null;
  row[C.SUM_RM] = b.rm || null;
  row[C.SUM_BLU] = b.blu || null;
  row[C.SUM_SBSN] = b.sbsn || null;
  row[C.JUMLAH_RAYA] = jumlah;
}

function buildWorkbook(
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
  aoa.push(emptyRow()); // baris kosong

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
  r[C.E] = 1;
  r[C.F] = "sat";
  r[C.G] = "x";
  r[C.H] = 2;
  r[C.I] = "sat";
  r[C.J] = "x";
  r[C.K] = 3;
  r[C.L] = "sat";
  r[C.M] = "x";
  r[C.N] = 4;
  r[C.O] = "sat";
  r[C.P] = "x";
  r[C.Q] = 5;
  r[C.R] = "sat";
  r[C.PEG_RM] = "RM";
  r[C.BAR_OPS_RM] = "RM";
  r[C.BAR_OPS_BLU] = "BLU";
  r[C.BAR_NON_RM] = "RM";
  r[C.BAR_NON_BLU] = "BLU";
  r[C.MODAL] = "SBSN";
  r[C.SUM_RM] = "RM";
  r[C.SUM_BLU] = "BLU";
  r[C.SUM_SBSN] = "SBSN";
  aoa.push(r);

  r = emptyRow();
  r[C.KODE] = "a";
  r[C.URAIAN] = "b";
  r[3] = "c";
  r[C.E] = "e";
  r[C.H] = "f";
  r[C.K] = "g";
  r[C.N] = "h";
  r[C.Q] = "i";
  r[C.VOL] = "j";
  r[C.SATUAN] = "k";
  r[C.HARGA] = "l";
  r[C.JUMLAH] = "m";
  r[C.PEG_RM] = "n";
  r[C.BAR_OPS_RM] = "o";
  r[C.BAR_OPS_BLU] = "p";
  r[C.BAR_NON_RM] = "q";
  r[C.BAR_NON_BLU] = "r";
  r[C.SUM_RM] = "s";
  r[C.SUM_BLU] = "t";
  r[C.JUMLAH_RAYA] = "u";
  r[C.SUMBER] = "v";
  aoa.push(r);

  // Baris total unit (mis. 022.12)
  r = emptyRow();
  r[C.KODE] = header.unitKode;
  r[C.URAIAN] = header.satkerNama;
  bucketsToRow(r, total, totalJumlah);
  aoa.push(r);

  // Baris data
  for (const k of kkRows) {
    r = emptyRow();
    if (!k.isDetail) r[C.KODE] = k.kode;
    r[C.URAIAN] = (k.isDetail ? "- " : "") + k.uraian;
    if (k.vol != null) {
      r[C.VOL] = k.vol;
      r[C.SATUAN] = k.satuan ?? null;
    }
    if (k.harga != null && k.harga > 0) r[C.HARGA] = k.harga;
    bucketsToRow(r, k.buckets, k.jumlah);
    if (k.level === "AKUN" && k.sumber && k.sumber !== "-")
      r[C.SUMBER] = k.sumber;
    aoa.push(r);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const m = (sr: number, sc: number, er: number, ec: number) => ({
    s: { r: sr, c: sc },
    e: { r: er, c: ec },
  });
  ws["!merges"] = [
    // judul melebar
    m(0, 1, 0, 32),
    m(1, 1, 1, 32),
    m(2, 1, 2, 32),
    // header tabel
    m(4, 1, 6, 1), // KODE
    m(4, 2, 6, 3), // URAIAN
    m(4, 4, 5, 17), // Detail
    m(4, 18, 6, 18), // Vol
    m(4, 19, 6, 19), // Satuan
    m(4, 20, 6, 20), // Harga
    m(4, 21, 6, 21), // Jumlah
    m(4, 22, 4, 24), // Belanja Operasional
    m(4, 25, 4, 27), // Belanja Non Operasional
    m(4, 28, 5, 30), // Sumber Dana
    m(4, 31, 6, 31), // Jumlah Raya
    m(4, 32, 6, 32), // Sumber Dana label
    m(5, 23, 5, 24), // Barang (ops) RM-BLU
    m(5, 25, 5, 26), // Barang (non) RM-BLU
    m(6, 4, 6, 6), // E:G
    m(6, 7, 6, 9), // H:J
    m(6, 10, 6, 12), // K:M
    m(6, 13, 6, 15), // N:P
    m(6, 16, 6, 17), // Q:R
  ];

  const widths: Record<number, number> = {
    0: 5.2, 1: 12.7, 2: 3.7, 3: 33.7, 4: 4.3, 5: 5.3, 6: 1.8, 7: 4.2,
    8: 8.5, 9: 1.8, 10: 3.7, 11: 8.7, 12: 1.8, 13: 4.7, 14: 6.7, 15: 1.8,
    16: 2.7, 17: 8.7, 18: 6.2, 19: 8.7, 20: 14.3, 21: 13, 22: 15.5,
    23: 12, 24: 13.8, 25: 13.5, 26: 18.2, 27: 12.5, 28: 11.7, 29: 12.5,
    30: 12.5, 31: 13, 32: 9.5,
  };
  ws["!cols"] = Array.from({ length: 33 }, (_, i) => ({ wch: widths[i] ?? 10 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DETAIL");
  return wb;
}
