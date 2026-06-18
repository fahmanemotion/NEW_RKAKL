"use client";
import * as React from "react";
import XLSX from "xlsx-js-style";
import { FileSpreadsheet, Printer, Download, Layers } from "lucide-react";
import { Card, Select, Button } from "@/components/ui";
import { fmtN } from "@/lib/constants";
import {
  buildRabPerKomponen,
  rincianText,
  terbilang,
  titleCase,
  type RabKomponen,
  type RabLine,
} from "@/lib/rab-data";
import type { KKRow } from "@/lib/kertas-kerja";

/* Penandatangan (mengikuti template; dapat disesuaikan bila perlu). */
const TTD = {
  kiriJabatan1: "KEPALA PUSAT",
  kiriJabatan2: "PENGEMBANGAN SDM PERHUBUNGAN LAUT",
  kiriNama: "BUDI RAHARDJO, S.Sos., M.Si.",
  kiriGol: "Pembina Utama Muda (IV/c)",
  kiriNip: "NIP. 19701106 199703 1 001",
  kananJabatan1: "KUASA PENGGUNA ANGGARAN",
  kananJabatan2: "POLITEKNIK ILMU PELAYARAN MAKASSAR",
  kananNama: "Capt. RUDY SUSANTO, M.Pd.",
  kananGol: "Pembina (IV/a)",
  kananNip: "NIP. 19731210 200502 1 001",
};
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface Ctx {
  satker: string;
  satkerKode: string;
  tahun: number;
}

export function RabSection({
  rows,
  ctx,
}: {
  rows: KKRow[];
  ctx: Ctx;
}) {
  const rabs = React.useMemo(() => buildRabPerKomponen(rows), [rows]);
  const [sel, setSel] = React.useState(0);
  React.useEffect(() => {
    setSel(0);
  }, [rabs]);

  if (rabs.length === 0) return null;
  const rab = rabs[Math.min(sel, rabs.length - 1)];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold">
          RAB per Komponen{" "}
          <span className="font-normal text-muted-foreground">
            ({rabs.length} komponen)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="min-w-[260px]"
          >
            {rabs.map((r, i) => (
              <option key={r.komponenId} value={i}>
                {r.komponenKode} — {r.komponenUraian} ({fmtN(r.total)})
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" onClick={() => printRab(rab, ctx)}>
            <Printer className="size-4" /> Cetak
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadOne(rab, ctx)}>
            <Download className="size-4" /> Unduh RAB ini
          </Button>
          <Button size="sm" onClick={() => downloadAll(rabs, ctx)}>
            <Layers className="size-4" /> Unduh Semua
          </Button>
        </div>
      </div>

      {/* Review on-screen */}
      <div className="space-y-3 p-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <HeaderLine label="Kementerian Negara/Lembaga" value="Kementerian Perhubungan" />
          <HeaderLine label="Unit Eselon II/Satker" value={ctx.satker} />
          <HeaderLine label="Program" value={rab.programUraian} />
          <HeaderLine label="Keluaran (Output)" value={`${rab.roKode} ${rab.roUraian}`} />
          <HeaderLine label="Komponen" value={`${rab.komponenKode} ${rab.komponenUraian}`} />
          <HeaderLine label="Alokasi Anggaran" value={fmtN(rab.total)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold">Kode</th>
                <th className="px-2 py-1.5 font-semibold">Uraian</th>
                <th className="px-2 py-1.5 font-semibold">Rincian</th>
                <th className="px-2 py-1.5 text-right font-semibold">Vol</th>
                <th className="px-2 py-1.5 font-semibold">Sat</th>
                <th className="px-2 py-1.5 text-right font-semibold">Harga</th>
                <th className="px-2 py-1.5 text-right font-semibold">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <ContextRow kode={rab.kroKode} uraian={rab.kroUraian} indent={0} jumlah={rab.total} />
              <ContextRow kode={rab.roKode} uraian={rab.roUraian} indent={1} jumlah={rab.total} />
              <ContextRow kode={rab.komponenKode} uraian={rab.komponenUraian} indent={2} jumlah={rab.total} bold />
              {rab.lines.map((l) => (
                <LineRow key={l.id} line={l} />
              ))}
              <tr className="border-t-2 border-border bg-muted/40 font-bold">
                <td className="px-2 py-1.5" colSpan={6}>
                  JUMLAH BIAYA
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtN(rab.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Terbilang: <em>{titleCase(terbilang(rab.total))}</em>
        </p>
      </div>
    </Card>
  );
}

function HeaderLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span>: {value}</span>
    </div>
  );
}

function ContextRow({
  kode,
  uraian,
  indent,
  jumlah,
  bold,
}: {
  kode: string;
  uraian: string;
  indent: number;
  jumlah: number;
  bold?: boolean;
}) {
  return (
    <tr className={`border-b border-border ${bold ? "font-semibold" : ""}`}>
      <td className="px-2 py-1 font-mono">{kode}</td>
      <td className="px-2 py-1">
        <span style={{ paddingLeft: indent * 10 }}>{uraian}</span>
      </td>
      <td colSpan={4}></td>
      <td className="px-2 py-1 text-right font-mono tabular-nums">{fmtN(jumlah)}</td>
    </tr>
  );
}

function LineRow({ line }: { line: RabLine }) {
  const indent = { SUB_KOMPONEN: 3, AKUN: 4, DETAIL: 5 }[line.level] ?? 3;
  const bold = line.level === "SUB_KOMPONEN" || line.level === "AKUN";
  return (
    <tr className={`border-b border-border ${bold ? "font-semibold" : ""}`}>
      <td className="px-2 py-1 font-mono">{line.kode}</td>
      <td className="px-2 py-1">
        <span style={{ paddingLeft: indent * 10 }}>
          {line.isDetail ? "- " : ""}
          {line.uraian}
        </span>
      </td>
      <td className="px-2 py-1 text-muted-foreground">
        {line.isDetail ? rincianText(line) : ""}
      </td>
      <td className="px-2 py-1 text-right tabular-nums">
        {line.isDetail && line.vol != null ? fmtN(line.vol) : ""}
      </td>
      <td className="px-2 py-1">{line.isDetail ? (line.satuan ?? "") : ""}</td>
      <td className="px-2 py-1 text-right tabular-nums">
        {line.isDetail && line.harga != null ? fmtN(line.harga) : ""}
      </td>
      <td className="px-2 py-1 text-right font-mono tabular-nums">
        {fmtN(line.jumlah)}
      </td>
    </tr>
  );
}

/* ───────────────────────── Excel ───────────────────────── */

const THIN = { style: "thin", color: { rgb: "9CA3AF" } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const MONEY = "#,##0;-#,##0;";

function indentFor(level: string): number {
  return (
    { KRO: 0, RO: 1, KOMPONEN: 2, SUB_KOMPONEN: 3, AKUN: 4, DETAIL: 5 }[level] ??
    0
  );
}

/** Bangun satu worksheet RAB untuk sebuah komponen. */
function buildRabSheet(rab: RabKomponen, ctx: Ctx): XLSX.WorkSheet {
  const A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6;
  const aoa: (string | number | null)[][] = [];
  const er = () => new Array(7).fill(null);
  const now = new Date();
  const tgl = `Makassar, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

  let r = er(); r[A] = "RINCIAN ANGGARAN BELANJA"; aoa.push(r);
  r = er(); r[A] = `KELUARAN (OUTPUT) KEGIATAN T.A. ${ctx.tahun}`; aoa.push(r);
  aoa.push(er());
  const hdr = (label: string, val: string | number) => {
    const x = er(); x[A] = label; x[C] = ":"; x[D] = val; aoa.push(x);
  };
  hdr("Kementerian Negara/Lembaga", "Kementerian Perhubungan");
  hdr("Unit Eselon II/Satker", ctx.satker);
  hdr("Program", rab.programUraian);
  hdr("Keluaran (Output)", `${rab.roKode}  ${rab.roUraian}`.trim());
  hdr("Volume", rab.roVolume ?? "");
  hdr("Satuan Ukur", rab.roSatuan ?? "");
  hdr("Alokasi Anggaran", rab.total);
  aoa.push(er());

  // Header tabel (excel row = aoa.length+1)
  const headRow = aoa.length; // 0-based index of header row
  r = er();
  r[A] = "Kode"; r[B] = "Uraian"; r[C] = "Rincian Perhitungan";
  r[D] = "Volume"; r[E] = "Satuan"; r[F] = "Harga Satuan"; r[G] = "Jumlah";
  aoa.push(r);

  // Susun daftar baris (konteks + lines)
  type Emit = {
    id: string; pid: string | null; kode: string; uraian: string;
    level: string; isDetail: boolean; rincian: string;
    vol: number | null; satuan: string | null; harga: number | null; jumlah: number;
  };
  const emit: Emit[] = [];
  emit.push({ id: "__kro", pid: null, kode: rab.kroKode, uraian: rab.kroUraian, level: "KRO", isDetail: false, rincian: "", vol: null, satuan: null, harga: null, jumlah: rab.total });
  emit.push({ id: "__ro", pid: "__kro", kode: rab.roKode, uraian: rab.roUraian, level: "RO", isDetail: false, rincian: "", vol: null, satuan: null, harga: null, jumlah: rab.total });
  emit.push({ id: rab.komponenId, pid: "__ro", kode: rab.komponenKode, uraian: rab.komponenUraian, level: "KOMPONEN", isDetail: false, rincian: "", vol: null, satuan: null, harga: null, jumlah: rab.total });
  for (const l of rab.lines) {
    emit.push({
      id: l.id, pid: l.parentId, kode: l.kode, uraian: l.uraian, level: l.level,
      isDetail: l.isDetail, rincian: l.isDetail ? rincianText(l) : "",
      vol: l.vol, satuan: l.satuan, harga: l.harga, jumlah: l.jumlah,
    });
  }

  const rowOf = new Map<string, number>(); // id → excel row (1-based)
  const dataStart = aoa.length + 1;
  emit.forEach((e, i) => rowOf.set(e.id, dataStart + i));

  for (const e of emit) {
    r = er();
    r[A] = e.isDetail ? "" : e.kode;
    r[B] = "  ".repeat(indentFor(e.level)) + (e.isDetail ? "- " : "") + e.uraian;
    if (e.isDetail) {
      r[C] = e.rincian;
      if (e.vol != null) r[D] = e.vol;
      r[E] = e.satuan ?? "";
      if (e.harga != null) r[F] = e.harga;
    }
    r[G] = e.jumlah || null;
    aoa.push(r);
  }

  // JUMLAH / TOTAL / Dibulatkan / Terbilang
  const jumlahRow = aoa.length + 1;
  r = er(); r[A] = "JUMLAH BIAYA"; r[C] = ":"; r[G] = rab.total; aoa.push(r);
  r = er(); r[A] = "TOTAL BIAYA"; r[C] = ":"; r[G] = rab.total; aoa.push(r);
  r = er(); r[A] = "Dibulatkan"; r[C] = ":"; r[G] = rab.total; aoa.push(r);
  r = er(); r[A] = "Terbilang"; r[C] = ":"; r[D] = titleCase(terbilang(rab.total)); aoa.push(r);
  aoa.push(er());

  // Tanda tangan
  const sig = aoa.length;
  r = er(); r[B] = "Mengetahui"; r[F] = tgl; aoa.push(r);
  r = er(); r[B] = TTD.kiriJabatan1; r[F] = TTD.kananJabatan1; aoa.push(r);
  r = er(); r[B] = TTD.kiriJabatan2; r[F] = TTD.kananJabatan2; aoa.push(r);
  aoa.push(er()); aoa.push(er()); aoa.push(er());
  r = er(); r[B] = TTD.kiriNama; r[F] = TTD.kananNama; aoa.push(r);
  r = er(); r[B] = TTD.kiriGol; r[F] = TTD.kananGol; aoa.push(r);
  r = er(); r[B] = TTD.kiriNip; r[F] = TTD.kananNip; aoa.push(r);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const enc = (row1: number, col0: number) =>
    XLSX.utils.encode_cell({ r: row1 - 1, c: col0 });
  const cl = (c: number) => XLSX.utils.encode_col(c);

  // Rumus: detail = ROUNDDOWN(D*F,-3); induk = SUM anak.
  const childrenRows = new Map<string, number[]>();
  for (const e of emit) {
    if (!e.pid) continue;
    const arr = childrenRows.get(e.pid) ?? [];
    arr.push(rowOf.get(e.id)!);
    childrenRows.set(e.pid, arr);
  }
  for (const e of emit) {
    const row1 = rowOf.get(e.id)!;
    const a = enc(row1, G);
    if (e.isDetail) {
      if (e.vol != null && e.harga != null && e.vol > 0 && e.harga > 0) {
        ws[a] = { t: "n", f: `ROUNDDOWN(${cl(D)}${row1}*${cl(F)}${row1},-3)`, v: e.jumlah };
      } else {
        ws[a] = { t: "n", v: e.jumlah };
      }
    } else {
      const kids = childrenRows.get(e.id) ?? [];
      if (kids.length) {
        ws[a] = { t: "n", f: kids.map((cr) => `${cl(G)}${cr}`).join("+"), v: e.jumlah };
      }
    }
  }
  // JUMLAH/TOTAL/Dibulatkan = G komponen
  const kompRow = rowOf.get(rab.komponenId)!;
  for (let i = 0; i < 3; i++) {
    ws[enc(jumlahRow + i, G)] = { t: "n", f: `${cl(G)}${kompRow}`, v: rab.total };
  }

  // Styling
  const setStyle = (ref: string, s: Record<string, unknown>) => {
    ws[ref] = ws[ref] || { t: "s", v: "" };
    (ws[ref] as { s?: unknown }).s = s;
  };
  // Judul
  setStyle(enc(1, A), { font: { bold: true, sz: 12 } });
  setStyle(enc(2, A), { font: { bold: true, sz: 10 } });
  // Header tabel
  for (let c = 0; c <= G; c++) {
    setStyle(enc(headRow + 1, c), {
      font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "44546A" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER,
    });
  }
  // Baris data
  emit.forEach((e) => {
    const row1 = rowOf.get(e.id)!;
    const fill =
      e.level === "KOMPONEN" ? "FFD966"
      : e.level === "SUB_KOMPONEN" ? "F4B183"
      : e.level === "AKUN" ? "D9D9D9"
      : e.level === "KRO" || e.level === "RO" ? "DDEBF7"
      : "FFFFFF";
    const bold = !e.isDetail;
    for (let c = 0; c <= G; c++) {
      const isNum = c === D || c === F || c === G;
      setStyle(enc(row1, c), {
        font: { sz: 9, bold },
        fill: { patternType: "solid", fgColor: { rgb: fill } },
        alignment: {
          horizontal: c === B || c === C ? "left" : isNum ? "right" : "center",
          vertical: "center",
        },
        border: BORDER,
        numFmt: isNum ? MONEY : undefined,
      });
    }
  });
  // JUMLAH/TOTAL rows G styling
  for (let i = 0; i < 3; i++) {
    setStyle(enc(jumlahRow + i, A), { font: { bold: true, sz: 9 } });
    setStyle(enc(jumlahRow + i, G), {
      font: { bold: true, sz: 9 }, numFmt: MONEY,
      alignment: { horizontal: "right" }, border: BORDER,
    });
  }
  // Tanda tangan tebal nama
  setStyle(enc(sig + 7, B), { font: { bold: true, sz: 9 } });
  setStyle(enc(sig + 7, F), { font: { bold: true, sz: 9 } });

  // Merge judul + kolom uraian header
  ws["!merges"] = [
    { s: { r: 0, c: A }, e: { r: 0, c: G } },
    { s: { r: 1, c: A }, e: { r: 1, c: G } },
  ];
  ws["!cols"] = [
    { wch: 14 }, { wch: 46 }, { wch: 18 }, { wch: 9 },
    { wch: 8 }, { wch: 16 }, { wch: 18 },
  ];
  return ws;
}

function safeSheetName(s: string): string {
  return (s || "RAB").replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "RAB";
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadOne(rab: RabKomponen, ctx: Ctx) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildRabSheet(rab, ctx), safeSheetName(rab.komponenKode));
  downloadWorkbook(
    wb,
    `RAB_${ctx.satkerKode || "Satker"}_Komp${rab.komponenKode}_TA${ctx.tahun}.xlsx`,
  );
}

function downloadAll(rabs: RabKomponen[], ctx: Ctx) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const rab of rabs) {
    let name = safeSheetName(rab.komponenKode);
    let i = 2;
    while (used.has(name)) name = safeSheetName(rab.komponenKode + "_" + i++);
    used.add(name);
    XLSX.utils.book_append_sheet(wb, buildRabSheet(rab, ctx), name);
  }
  downloadWorkbook(wb, `RAB_${ctx.satkerKode || "Satker"}_SemuaKomponen_TA${ctx.tahun}.xlsx`);
}

/* ───────────────────────── Cetak (HTML) ───────────────────────── */

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function printRab(rab: RabKomponen, ctx: Ctx) {
  const now = new Date();
  const tgl = `Makassar, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
  const lineRows = rab.lines
    .map((l) => {
      const ind = ({ SUB_KOMPONEN: 3, AKUN: 4, DETAIL: 5 }[l.level] ?? 3) * 14;
      const bold = l.level === "SUB_KOMPONEN" || l.level === "AKUN" ? "font-weight:bold" : "";
      return `<tr style="${bold}">
        <td class="mono">${esc(l.kode)}</td>
        <td style="padding-left:${ind}px">${l.isDetail ? "- " : ""}${esc(l.uraian)}</td>
        <td>${l.isDetail ? esc(rincianText(l)) : ""}</td>
        <td class="r">${l.isDetail && l.vol != null ? fmtN(l.vol) : ""}</td>
        <td>${l.isDetail ? esc(l.satuan ?? "") : ""}</td>
        <td class="r">${l.isDetail && l.harga != null ? fmtN(l.harga) : ""}</td>
        <td class="r">${fmtN(l.jumlah)}</td></tr>`;
    })
    .join("");
  const ctxRow = (kode: string, ur: string, ind: number, b: boolean) =>
    `<tr style="${b ? "font-weight:bold" : ""}"><td class="mono">${esc(kode)}</td><td style="padding-left:${ind * 14}px">${esc(ur)}</td><td colspan="4"></td><td class="r">${fmtN(rab.total)}</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>RAB ${esc(rab.komponenKode)}</title>
<style>
  *{font-family:Arial,sans-serif;font-size:11px}
  h1{font-size:13px;text-align:center;margin:0}
  h2{font-size:11px;text-align:center;margin:0 0 8px}
  table{border-collapse:collapse;width:100%;margin-top:8px}
  th,td{border:1px solid #999;padding:3px 5px;vertical-align:top}
  th{background:#44546a;color:#fff;text-align:center}
  .r{text-align:right;white-space:nowrap}
  .mono{font-family:'Courier New',monospace}
  .hdr td{border:none;padding:1px 4px}
  .sig{margin-top:24px;width:100%;border:none}
  .sig td{border:none;text-align:center;vertical-align:top;padding:2px}
  @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="margin-bottom:10px;padding:6px 12px">Cetak / Simpan PDF</button>
<h1>RINCIAN ANGGARAN BELANJA</h1>
<h2>KELUARAN (OUTPUT) KEGIATAN T.A. ${ctx.tahun}</h2>
<table class="hdr">
  <tr><td style="width:200px">Kementerian Negara/Lembaga</td><td style="width:10px">:</td><td>Kementerian Perhubungan</td></tr>
  <tr><td>Unit Eselon II/Satker</td><td>:</td><td>${esc(ctx.satker)}</td></tr>
  <tr><td>Program</td><td>:</td><td>${esc(rab.programUraian)}</td></tr>
  <tr><td>Keluaran (Output)</td><td>:</td><td>${esc(rab.roKode)} ${esc(rab.roUraian)}</td></tr>
  <tr><td>Komponen</td><td>:</td><td>${esc(rab.komponenKode)} ${esc(rab.komponenUraian)}</td></tr>
  <tr><td>Alokasi Anggaran</td><td>:</td><td>${fmtN(rab.total)}</td></tr>
</table>
<table>
  <tr><th>Kode</th><th>Uraian</th><th>Rincian Perhitungan</th><th>Volume</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th></tr>
  ${ctxRow(rab.kroKode, rab.kroUraian, 0, false)}
  ${ctxRow(rab.roKode, rab.roUraian, 1, false)}
  ${ctxRow(rab.komponenKode, rab.komponenUraian, 2, true)}
  ${lineRows}
  <tr style="font-weight:bold;background:#eee"><td colspan="6">JUMLAH BIAYA</td><td class="r">${fmtN(rab.total)}</td></tr>
</table>
<p><strong>Terbilang:</strong> <em>${esc(titleCase(terbilang(rab.total)))}</em></p>
<table class="sig">
  <tr><td>Mengetahui</td><td></td><td>${esc(tgl)}</td></tr>
  <tr><td>${esc(TTD.kiriJabatan1)}</td><td></td><td>${esc(TTD.kananJabatan1)}</td></tr>
  <tr><td>${esc(TTD.kiriJabatan2)}</td><td></td><td>${esc(TTD.kananJabatan2)}</td></tr>
  <tr><td style="height:60px"></td><td></td><td></td></tr>
  <tr><td style="font-weight:bold;text-decoration:underline">${esc(TTD.kiriNama)}</td><td></td><td style="font-weight:bold;text-decoration:underline">${esc(TTD.kananNama)}</td></tr>
  <tr><td>${esc(TTD.kiriGol)}</td><td></td><td>${esc(TTD.kananGol)}</td></tr>
  <tr><td>${esc(TTD.kiriNip)}</td><td></td><td>${esc(TTD.kananNip)}</td></tr>
</table>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
