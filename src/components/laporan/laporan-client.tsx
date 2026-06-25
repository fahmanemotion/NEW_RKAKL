"use client";
import * as React from "react";
import type XLSXTypes from "xlsx-js-style";
import { loadXLSXStyle } from "@/lib/xlsx-lazy";
import { Loader2, Inbox, Printer, Download } from "lucide-react";
import { Card, Select, Button, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { fetchAllStruktur } from "@/lib/fetch-struktur";
import { fmtN } from "@/lib/constants";
import { STATUS_COLOR, type Status } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import type { UsulanStruktur } from "@/types/database";
import { buildKertasKerja } from "@/lib/kertas-kerja";
import {
  rekapSumber,
  rekapJenis,
  rekapKategori,
  rekapStruktur,
  rekapAkun,
  type RekapItem,
  type RekapAkunRow,
} from "@/lib/laporan-data";
import { RabSection } from "./rab-section";

export interface LaporanUsulan {
  id: string;
  tahun: number;
  tahap: string;
  status: string;
  satkerNama: string;
  satkerKode: string;
  total?: number;
  totalHeader?: number | null;
}

export function LaporanClient({
  usulanList,
}: {
  usulanList: LaporanUsulan[];
}) {
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
  const sumber = React.useMemo(
    () => rekapSumber(kk.total, kk.totalJumlah),
    [kk],
  );
  const jenis = React.useMemo(
    () => rekapJenis(kk.total, kk.totalJumlah),
    [kk],
  );
  const kategori = React.useMemo(
    () => rekapKategori(kk.total, kk.totalJumlah),
    [kk],
  );
  const struktur = React.useMemo(() => rekapStruktur(kk.rows, 3), [kk]);
  const akun = React.useMemo(
    () => rekapAkun(kk.rows, kk.totalJumlah),
    [kk],
  );

  const tahapLabel = usulan
    ? (TAHAP_LABEL[usulan.tahap as TahapPagu] ?? usulan.tahap)
    : "";

  function printReport() {
    if (!usulan) return;
    const html = buildPrintHtml({
      satker: usulan.satkerNama,
      tahapLabel,
      tahun: usulan.tahun,
      total: kk.totalJumlah,
      sumber,
      jenis,
      kategori,
      struktur,
      akun,
    });
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  async function downloadExcel() {
    if (!usulan) return;
    const XLSX = await loadXLSXStyle();
    const wb = buildRekapWorkbook(XLSX, {
      satker: usulan.satkerNama,
      tahapLabel,
      tahun: usulan.tahun,
      total: kk.totalJumlah,
      sumber,
      jenis,
      kategori,
      struktur,
      akun,
    });
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_${usulan.satkerKode || "Satker"}_${tahapLabel.replace(/\s+/g, "_")}_TA${usulan.tahun}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const noData = usulanList.length === 0;
  const ready = !!usulan && kk.rows.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Rekapitulasi anggaran — cetak atau unduh.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
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
          <Button variant="outline" onClick={printReport} disabled={!ready}>
            <Printer className="size-4" /> Cetak
          </Button>
          <Button onClick={downloadExcel} disabled={!ready}>
            <Download className="size-4" /> Unduh Excel
          </Button>
        </div>
      </div>

      {noData ? (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada usulan untuk dilaporkan.
          </p>
        </Card>
      ) : loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </Card>
      ) : kk.rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Inbox className="mx-auto mb-2 size-6" />
          Tahap ini belum memiliki rincian.
        </Card>
      ) : (
        <>
          {usulan && (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold uppercase">
                    {usulan.satkerNama}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tahapLabel} · T.A. {usulan.tahun}
                    <Badge
                      className={`ml-2 ${STATUS_COLOR[usulan.status as Status] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {usulan.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    Total Pagu
                  </div>
                  <div className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {fmtN(kk.totalJumlah)}
                  </div>
                  {usulan.totalHeader != null &&
                    usulan.totalHeader > 0 &&
                    Math.abs(usulan.totalHeader - kk.totalJumlah) >= 1 && (
                      <div className="mt-1 max-w-[260px] text-[11px] leading-snug text-muted-foreground">
                        Header file SAKTI: {fmtN(usulan.totalHeader)} (selisih{" "}
                        {fmtN(Math.abs(kk.totalJumlah - usulan.totalHeader))}).
                        Angka di atas menjumlahkan seluruh rincian; selisih
                        berasal dari akun yang rinciannya melebihi pagu akun
                        (umumnya gaji/tunjangan pada Pagu Kebutuhan).
                      </div>
                    )}
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <RekapTable
              title="Rekap per Sumber Dana"
              items={sumber}
              total={kk.totalJumlah}
            />
            <RekapTable
              title="Rekap per Kategori"
              items={kategori}
              total={kk.totalJumlah}
            />
          </div>
          <RekapTable
            title="Rekap per Jenis Belanja"
            items={jenis}
            total={kk.totalJumlah}
          />

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
              Rekap per Akun (BAS)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Kode</th>
                    <th className="px-3 py-2 font-semibold">Uraian</th>
                    <th className="px-3 py-2 font-semibold">Jenis</th>
                    <th className="px-3 py-2 text-right font-semibold">Pagu</th>
                    <th className="px-3 py-2 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {akun.map((a) => (
                    <tr
                      key={a.kode}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {a.kode}
                      </td>
                      <td className="px-3 py-1.5">{a.uraian}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">
                        {a.jenis}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {fmtN(a.value)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted-foreground tabular-nums">
                        {a.pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-bold">
                    <td className="px-3 py-2" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {fmtN(kk.totalJumlah)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
              Ringkasan Struktur (Program → Kegiatan → KRO → RO)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Kode</th>
                    <th className="px-3 py-2 font-semibold">Uraian</th>
                    <th className="px-3 py-2 text-right font-semibold">Pagu</th>
                  </tr>
                </thead>
                <tbody>
                  {struktur.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {r.kode}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          style={{ paddingLeft: r.depth * 12 }}
                          className={
                            r.level === "PROGRAM" || r.level === "KEGIATAN"
                              ? "font-semibold"
                              : ""
                          }
                        >
                          {r.uraian}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {fmtN(r.jumlah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <RabSection
            rows={kk.rows}
            ctx={{
              satker: usulan.satkerNama,
              satkerKode: usulan.satkerKode,
              tahun: usulan.tahun,
            }}
          />
        </>
      )}
    </div>
  );
}

function RekapTable({
  title,
  items,
  total,
}: {
  title: string;
  items: RekapItem[];
  total: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((it) => (
            <tr key={it.label} className="border-b border-border last:border-0">
              <td className="px-4 py-2">{it.label}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">
                {fmtN(it.value)}
              </td>
              <td className="w-16 px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {it.pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40 font-bold">
            <td className="px-4 py-2">Total</td>
            <td className="px-4 py-2 text-right font-mono tabular-nums">
              {fmtN(total)}
            </td>
            <td className="px-4 py-2 text-right text-xs tabular-nums">100%</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

/* ── Cetak (HTML jendela baru) ───────────────────────────────────────────── */

interface ReportData {
  satker: string;
  tahapLabel: string;
  tahun: number;
  total: number;
  sumber: RekapItem[];
  jenis: RekapItem[];
  kategori: RekapItem[];
  struktur: { kode: string; uraian: string; level: string; depth: number; jumlah: number }[];
  akun: RekapAkunRow[];
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function rekapRows(items: RekapItem[], total: number): string {
  const body = items
    .map(
      (it) =>
        `<tr><td>${esc(it.label)}</td><td class="r">${fmtN(it.value)}</td><td class="r">${it.pct.toFixed(1)}%</td></tr>`,
    )
    .join("");
  return `${body}<tr class="tot"><td>Total</td><td class="r">${fmtN(total)}</td><td class="r">100%</td></tr>`;
}

function buildPrintHtml(d: ReportData): string {
  const strukturRows = d.struktur
    .map(
      (r) =>
        `<tr><td class="mono">${esc(r.kode)}</td><td style="padding-left:${r.depth * 14}px">${
          r.level === "PROGRAM" || r.level === "KEGIATAN"
            ? `<b>${esc(r.uraian)}</b>`
            : esc(r.uraian)
        }</td><td class="r">${fmtN(r.jumlah)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Anggaran</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:28px;font-size:12px}
  h1{font-size:16px;margin:0 0 2px} .sub{color:#555;margin:0 0 16px;font-size:12px}
  h2{font-size:13px;margin:18px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th,td{border:1px solid #bbb;padding:4px 8px;font-size:11px}
  th{background:#f0f0f0;text-align:left}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  .mono{font-family:'Courier New',monospace}
  .tot{font-weight:bold;background:#f7f7f7}
  .grand{font-size:13px;font-weight:bold;margin:6px 0 0}
  @media print{body{margin:12mm}}
</style></head><body>
<h1>LAPORAN REKAPITULASI ANGGARAN</h1>
<p class="sub">${esc(d.satker)} &middot; ${esc(d.tahapLabel)} &middot; T.A. ${d.tahun}</p>
<p class="grand">Total Pagu: Rp ${fmtN(d.total)}</p>
<h2>Rekap per Sumber Dana</h2>
<table><tr><th>Sumber Dana</th><th class="r">Pagu</th><th class="r">%</th></tr>${rekapRows(d.sumber, d.total)}</table>
<h2>Rekap per Kategori</h2>
<table><tr><th>Kategori</th><th class="r">Pagu</th><th class="r">%</th></tr>${rekapRows(d.kategori, d.total)}</table>
<h2>Rekap per Jenis Belanja</h2>
<table><tr><th>Jenis Belanja</th><th class="r">Pagu</th><th class="r">%</th></tr>${rekapRows(d.jenis, d.total)}</table>
<h2>Rekap per Akun (BAS)</h2>
<table><tr><th>Kode</th><th>Uraian</th><th>Jenis</th><th class="r">Pagu</th><th class="r">%</th></tr>${d.akun
    .map(
      (a) =>
        `<tr><td class="mono">${esc(a.kode)}</td><td>${esc(a.uraian)}</td><td>${esc(a.jenis)}</td><td class="r">${fmtN(a.value)}</td><td class="r">${a.pct.toFixed(1)}%</td></tr>`,
    )
    .join(
      "",
    )}<tr class="tot"><td colspan="3">Total</td><td class="r">${fmtN(d.total)}</td><td class="r">100%</td></tr></table>
<h2>Ringkasan Struktur (Program &rarr; Kegiatan &rarr; KRO &rarr; RO)</h2>
<table><tr><th>Kode</th><th>Uraian</th><th class="r">Pagu</th></tr>${strukturRows}</table>
</body></html>`;
}

/* ── Unduh Excel (rekap) ─────────────────────────────────────────────────── */

function buildRekapWorkbook(XLSX: XLSXTypes, d: ReportData) {
  const NUMFMT = "#,##0";
  const fTitle = { font: { bold: true, sz: 13 } };
  const fBold = { font: { bold: true } };
  const fHead = {
    font: { bold: true },
    fill: { patternType: "solid", fgColor: { rgb: "E5E7EB" } },
  };
  const numStyle = { numFmt: NUMFMT, alignment: { horizontal: "right" } };
  const numBold = {
    numFmt: NUMFMT,
    font: { bold: true },
    alignment: { horizontal: "right" },
  };

  const aoa: (string | number | null)[][] = [];
  const styles: { r: number; c: number; s: Record<string, unknown> }[] = [];
  let R = 0;
  const row = (vals: (string | number | null)[]) => {
    aoa.push(vals);
    return R++;
  };
  const sty = (r: number, c: number, s: Record<string, unknown>) =>
    styles.push({ r, c, s });

  let r = row(["LAPORAN REKAPITULASI ANGGARAN"]);
  sty(r, 0, fTitle);
  row([`${d.satker} · ${d.tahapLabel} · T.A. ${d.tahun}`]);
  r = row(["Total Pagu", d.total]);
  sty(r, 0, fBold);
  sty(r, 1, numBold);
  row([]);

  const section = (heading: string, items: RekapItem[]) => {
    r = row([heading]);
    sty(r, 0, fBold);
    r = row(["Uraian", "Pagu", "%"]);
    sty(r, 0, fHead);
    sty(r, 1, fHead);
    sty(r, 2, fHead);
    for (const it of items) {
      r = row([it.label, it.value, Number(it.pct.toFixed(1))]);
      sty(r, 1, numStyle);
    }
    r = row(["Total", d.total, 100]);
    sty(r, 0, fBold);
    sty(r, 1, numBold);
    sty(r, 2, fBold);
    row([]);
  };
  section("Rekap per Sumber Dana", d.sumber);
  section("Rekap per Kategori", d.kategori);
  section("Rekap per Jenis Belanja", d.jenis);

  // Rekap per Akun (BAS) — 5 kolom
  r = row(["Rekap per Akun (BAS)"]);
  sty(r, 0, fBold);
  r = row(["Kode", "Uraian", "Jenis", "Pagu", "%"]);
  sty(r, 0, fHead);
  sty(r, 1, fHead);
  sty(r, 2, fHead);
  sty(r, 3, fHead);
  sty(r, 4, fHead);
  for (const a of d.akun) {
    r = row([a.kode, a.uraian, a.jenis, a.value, Number(a.pct.toFixed(1))]);
    sty(r, 3, numStyle);
  }
  r = row(["Total", "", "", d.total, 100]);
  sty(r, 0, fBold);
  sty(r, 3, numBold);
  sty(r, 4, fBold);
  row([]);

  r = row(["Ringkasan Struktur (Program → Kegiatan → KRO → RO)"]);
  sty(r, 0, fBold);
  r = row(["Kode", "Uraian", "Pagu"]);
  sty(r, 0, fHead);
  sty(r, 1, fHead);
  sty(r, 2, fHead);
  for (const s of d.struktur) {
    r = row([s.kode, "  ".repeat(s.depth) + s.uraian, s.jumlah]);
    sty(r, 2, numStyle);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for (const { r: rr, c, s } of styles) {
    const a = XLSX.utils.encode_cell({ r: rr, c });
    if (!ws[a]) ws[a] = { t: "s", v: "" };
    (ws[a] as { s?: unknown }).s = s;
  }
  ws["!cols"] = [
    { wch: 16 },
    { wch: 48 },
    { wch: 12 },
    { wch: 18 },
    { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "REKAP");
  return wb;
}
