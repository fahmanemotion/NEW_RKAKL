"use client";
import * as React from "react";
import XLSX from "xlsx-js-style";
import { Printer, Download, Layers } from "lucide-react";
import { Card, Select, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { fmtN } from "@/lib/constants";
import {
  buildRabPerKomponen,
  buildRabPerSubKomponen,
  rincianText,
  terbilang,
  titleCase,
  type RabUnit,
  type RabLine,
} from "@/lib/rab-data";
import type { KKRow } from "@/lib/kertas-kerja";

interface Signer {
  nama: string;
  jabatan: string;
  pangkat: string;
  nip: string;
}
interface Signers {
  kiri: Signer;
  kanan: Signer;
  kota: string;
}
const DEFAULT_SIGNERS: Signers = {
  kiri: {
    nama: "BUDI RAHARDJO, S.Sos., M.Si.",
    jabatan: "KEPALA PUSAT PENGEMBANGAN SDM PERHUBUNGAN LAUT",
    pangkat: "Pembina Utama Muda (IV/c)",
    nip: "19701106 199703 1 001",
  },
  kanan: {
    nama: "Capt. RUDY SUSANTO, M.Pd.",
    jabatan: "KUASA PENGGUNA ANGGARAN POLITEKNIK ILMU PELAYARAN MAKASSAR",
    pangkat: "Pembina (IV/a)",
    nip: "19731210 200502 1 001",
  },
  kota: "Makassar",
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
type Mode = "SUB" | "KOMPONEN";

export function RabSection({ rows, ctx }: { rows: KKRow[]; ctx: Ctx }) {
  const [mode, setMode] = React.useState<Mode>("SUB");
  const units = React.useMemo(
    () => (mode === "SUB" ? buildRabPerSubKomponen(rows) : buildRabPerKomponen(rows)),
    [rows, mode],
  );
  const [sel, setSel] = React.useState(0);
  React.useEffect(() => setSel(0), [units]);

  interface PersonRow { id: string; nama: string; jabatan: string; pangkat: string; nip: string }
  const [people, setPeople] = React.useState<PersonRow[]>([]);
  const [kiriId, setKiriId] = React.useState("");
  const [kananId, setKananId] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb
          .from("master_penandatangan")
          .select("id, nama, jabatan, pangkat_golongan, nip")
          .order("nama", { ascending: true });
        if (!alive || !data) return;
        const list: PersonRow[] = (data as {
          id: string; nama: string; jabatan: string | null;
          pangkat_golongan: string | null; nip: string | null;
        }[]).map((r) => ({
          id: r.id, nama: r.nama ?? "", jabatan: r.jabatan ?? "",
          pangkat: r.pangkat_golongan ?? "", nip: r.nip ?? "",
        }));
        setPeople(list);
        if (list[0]) setKiriId((k) => k || list[0].id);
        if (list[1]) setKananId((k) => k || list[1].id);
      } catch {
        /* pakai default */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (units.length === 0) return null;
  const unit = units[Math.min(sel, units.length - 1)];
  const toSigner = (p: PersonRow): Signer => ({ nama: p.nama, jabatan: p.jabatan, pangkat: p.pangkat, nip: p.nip });
  const kiriP = people.find((p) => p.id === kiriId);
  const kananP = people.find((p) => p.id === kananId);
  const signers: Signers = {
    kiri: kiriP ? toSigner(kiriP) : DEFAULT_SIGNERS.kiri,
    kanan: kananP ? toSigner(kananP) : DEFAULT_SIGNERS.kanan,
    kota: DEFAULT_SIGNERS.kota,
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">RAB</div>
          <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
            <button
              onClick={() => setMode("SUB")}
              className={`px-3 py-1.5 ${mode === "SUB" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              Per Sub Komponen
            </button>
            <button
              onClick={() => setMode("KOMPONEN")}
              className={`px-3 py-1.5 ${mode === "KOMPONEN" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              Per Komponen
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Penanda tangan:</span>
          <label className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Kiri</span>
            <Select value={kiriId} onChange={(e) => setKiriId(e.target.value)} className="min-w-[200px]">
              <option value="">— pilih —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === kananId}>{p.nama}</option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Kanan</span>
            <Select value={kananId} onChange={(e) => setKananId(e.target.value)} className="min-w-[200px]">
              <option value="">— pilih —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === kiriId}>{p.nama}</option>
              ))}
            </Select>
          </label>
          {people.length === 0 && (
            <span className="text-xs text-muted-foreground">
              (tambah di Referensi → Penandatanganan)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="min-w-[280px]"
          >
            {units.map((u, i) => (
              <option key={u.id} value={i}>
                {u.sheetName} — {labelOf(u)} ({fmtN(u.total)})
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" onClick={() => printRab(unit, ctx, signers)}>
            <Printer className="size-4" /> Cetak
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadOne(unit, ctx, signers)}>
            <Download className="size-4" /> Unduh ini
          </Button>
          <Button size="sm" onClick={() => downloadAll(units, ctx, signers, mode)}>
            <Layers className="size-4" /> Unduh Semua
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "SUB"
            ? "Rincian penuh (akun → detail) untuk tiap sub komponen."
            : "Rekap: tiap komponen menampilkan sub komponen sebagai baris ringkasan."}
        </p>
      </div>

      {/* Review */}
      <div className="space-y-3 p-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <HeaderLine label="Kementerian Negara/Lembaga" value="Kementerian Perhubungan" />
          <HeaderLine label="Unit Eselon II/Satker" value={ctx.satker} />
          <HeaderLine label="Program" value={unit.programUraian} />
          <HeaderLine label="Keluaran (Output)" value={`${unit.roKode} ${unit.roUraian}`} />
          <HeaderLine label="Komponen" value={`${unit.komponenKode} ${unit.komponenUraian}`} />
          {unit.level === "SUB_KOMPONEN" && (
            <HeaderLine label="Sub Komponen" value={`${unit.subKode} ${unit.subUraian}`} />
          )}
          <HeaderLine label="Alokasi Anggaran" value={`Rp ${fmtN(unit.total)}`} />
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
              <ContextRow kode={unit.kroKode} uraian={unit.kroUraian} indent={0} jumlah={unit.total} />
              <ContextRow kode={unit.roKode} uraian={unit.roUraian} indent={1} jumlah={unit.total} />
              <ContextRow kode={unit.komponenKode} uraian={unit.komponenUraian} indent={2} jumlah={unit.total} bold />
              {unit.level === "SUB_KOMPONEN" && (
                <ContextRow kode={unit.subKode ?? ""} uraian={unit.subUraian ?? ""} indent={3} jumlah={unit.total} bold />
              )}
              {unit.lines.map((l) => (
                <LineRow key={l.id} line={l} />
              ))}
              <tr className="border-t-2 border-border bg-muted/40 font-bold">
                <td className="px-2 py-1.5" colSpan={6}>JUMLAH BIAYA</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtN(unit.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Terbilang: <em>{titleCase(terbilang(unit.total))}</em>
        </p>
      </div>
    </Card>
  );
}

function labelOf(u: RabUnit): string {
  return u.level === "SUB_KOMPONEN" ? (u.subUraian ?? "") : u.komponenUraian;
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
  kode, uraian, indent, jumlah, bold,
}: { kode: string; uraian: string; indent: number; jumlah: number; bold?: boolean }) {
  return (
    <tr className={`border-b border-border ${bold ? "font-semibold" : ""}`}>
      <td className="px-2 py-1 font-mono">{kode}</td>
      <td className="px-2 py-1"><span style={{ paddingLeft: indent * 10 }}>{uraian}</span></td>
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
        <span style={{ paddingLeft: indent * 10 }}>{line.isDetail ? "- " : ""}{line.uraian}</span>
      </td>
      <td className="px-2 py-1 text-muted-foreground">{line.isDetail ? rincianText(line) : ""}</td>
      <td className="px-2 py-1 text-right tabular-nums">{line.isDetail && line.vol != null ? fmtN(line.vol) : ""}</td>
      <td className="px-2 py-1">{line.isDetail ? (line.satuan ?? "") : ""}</td>
      <td className="px-2 py-1 text-right tabular-nums">{line.isDetail && line.harga != null ? fmtN(line.harga) : ""}</td>
      <td className="px-2 py-1 text-right font-mono tabular-nums">{fmtN(line.jumlah)}</td>
    </tr>
  );
}

/* ───────────────────────── Excel ───────────────────────── */

const THIN = { style: "thin", color: { rgb: "9CA3AF" } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const MONEY = "#,##0;-#,##0;";
const RP = '"Rp"#,##0;"Rp"-#,##0';

function indentFor(level: string): number {
  return { KRO: 0, RO: 1, KOMPONEN: 2, SUB_KOMPONEN: 3, AKUN: 4, DETAIL: 5 }[level] ?? 0;
}

type Emit = {
  id: string; pid: string | null; kode: string; uraian: string;
  level: string; isDetail: boolean; rincian: string;
  vol: number | null; satuan: string | null; harga: number | null; jumlah: number;
};

function buildRabSheet(unit: RabUnit, ctx: Ctx, signers: Signers): XLSX.WorkSheet {
  const A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6;
  const aoa: (string | number | null)[][] = [];
  const er = () => new Array(7).fill(null);
  const now = new Date();
  const tgl = `${signers.kota}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

  let r = er(); r[A] = "RINCIAN ANGGARAN BELANJA"; aoa.push(r);
  r = er(); r[A] = `KELUARAN (OUTPUT) KEGIATAN T.A. ${ctx.tahun}`; aoa.push(r);
  aoa.push(er());

  const hdrFirst = aoa.length + 1;
  const hdr = (label: string, val: string | number) => {
    const x = er(); x[A] = label; x[C] = ":"; x[D] = val; aoa.push(x);
  };
  hdr("Kementerian Negara/Lembaga", "Kementerian Perhubungan");
  hdr("Unit Eselon II/Satker", ctx.satker);
  hdr("Program", unit.programUraian);
  hdr("Keluaran (Output)", `${unit.roKode}  ${unit.roUraian}`.trim());
  hdr("Komponen", `${unit.komponenKode}  ${unit.komponenUraian}`.trim());
  if (unit.level === "SUB_KOMPONEN")
    hdr("Sub Komponen", `${unit.subKode ?? ""}  ${unit.subUraian ?? ""}`.trim());
  hdr("Volume", unit.roVolume ?? "");
  hdr("Satuan Ukur", unit.roSatuan ?? "");
  hdr("Alokasi Anggaran", unit.total);
  const hdrCount = aoa.length + 1 - hdrFirst;
  const alokasiRow = aoa.length; // baris Alokasi (1-based)
  aoa.push(er());

  const headRow = aoa.length; // 0-based index baris header tabel
  r = er();
  r[A] = "Kode"; r[B] = "Uraian"; r[C] = "Rincian Perhitungan";
  r[D] = "Volume"; r[E] = "Satuan"; r[F] = "Harga Satuan"; r[G] = "Jumlah";
  aoa.push(r);

  // Susun emit (konteks + lines)
  const emit: Emit[] = [];
  const ctxRow = (id: string, pid: string | null, kode: string, uraian: string, level: string) =>
    emit.push({ id, pid, kode, uraian, level, isDetail: false, rincian: "", vol: null, satuan: null, harga: null, jumlah: unit.total });
  ctxRow("__kro", null, unit.kroKode, unit.kroUraian, "KRO");
  ctxRow("__ro", "__kro", unit.roKode, unit.roUraian, "RO");
  ctxRow(unit.komponenId, "__ro", unit.komponenKode, unit.komponenUraian, "KOMPONEN");
  if (unit.level === "SUB_KOMPONEN")
    ctxRow(unit.id, unit.komponenId, unit.subKode ?? "", unit.subUraian ?? "", "SUB_KOMPONEN");
  for (const l of unit.lines) {
    emit.push({
      id: l.id, pid: l.parentId, kode: l.kode, uraian: l.uraian, level: l.level,
      isDetail: l.isDetail, rincian: l.isDetail ? rincianText(l) : "",
      vol: l.vol, satuan: l.satuan, harga: l.harga, jumlah: l.jumlah,
    });
  }

  const rowOf = new Map<string, number>();
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

  const jumlahRow = aoa.length + 1;
  r = er(); r[A] = "JUMLAH BIAYA"; r[G] = unit.total; aoa.push(r);
  r = er(); r[A] = "TOTAL BIAYA"; r[G] = unit.total; aoa.push(r);
  r = er(); r[A] = "Dibulatkan"; r[G] = unit.total; aoa.push(r);
  const terbilangRow = aoa.length + 1;
  r = er(); r[A] = "Terbilang :"; r[B] = titleCase(terbilang(unit.total)); aoa.push(r);
  aoa.push(er()); aoa.push(er());

  // Tanda tangan
  const sig = aoa.length;
  const k = signers.kiri, n = signers.kanan;
  r = er(); r[A] = "Mengetahui"; r[E] = tgl; aoa.push(r);
  r = er(); r[A] = k.jabatan; r[E] = n.jabatan; aoa.push(r);
  aoa.push(er()); aoa.push(er()); aoa.push(er());
  r = er(); r[A] = k.nama; r[E] = n.nama; aoa.push(r);
  r = er(); r[A] = k.pangkat; r[E] = n.pangkat; aoa.push(r);
  r = er(); r[A] = "NIP. " + k.nip; r[E] = "NIP. " + n.nip; aoa.push(r);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const enc = (row1: number, col0: number) => XLSX.utils.encode_cell({ r: row1 - 1, c: col0 });
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
      if (e.vol != null && e.harga != null && e.vol > 0 && e.harga > 0)
        ws[a] = { t: "n", f: `ROUNDDOWN(${cl(D)}${row1}*${cl(F)}${row1},-3)`, v: e.jumlah };
      else ws[a] = { t: "n", v: e.jumlah };
    } else {
      const kids = childrenRows.get(e.id) ?? [];
      if (kids.length)
        ws[a] = { t: "n", f: kids.map((cr) => `${cl(G)}${cr}`).join("+"), v: e.jumlah };
    }
  }
  const kompRow = rowOf.get(unit.komponenId)!;
  for (let i = 0; i < 3; i++)
    ws[enc(jumlahRow + i, G)] = { t: "n", f: `${cl(G)}${kompRow}`, v: unit.total };

  // Styling
  const setStyle = (ref: string, s: Record<string, unknown>) => {
    ws[ref] = ws[ref] || { t: "s", v: "" };
    (ws[ref] as { s?: unknown }).s = s;
  };
  setStyle(enc(1, A), { font: { bold: true, sz: 12 }, alignment: { horizontal: "center" } });
  setStyle(enc(2, A), { font: { bold: true, sz: 10 }, alignment: { horizontal: "center" } });
  for (let i = 0; i < hdrCount; i++) {
    const rr = hdrFirst + i;
    const isAlok = rr === alokasiRow;
    setStyle(enc(rr, A), { font: { sz: 9 }, alignment: { horizontal: "left", vertical: "center" } });
    setStyle(enc(rr, C), { font: { sz: 9 }, alignment: { horizontal: "center", vertical: "center" } });
    setStyle(enc(rr, D), {
      font: { sz: 9, bold: isAlok },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      numFmt: isAlok ? RP : undefined,
    });
  }
  for (let c = 0; c <= G; c++) {
    setStyle(enc(headRow + 1, c), {
      font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "44546A" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER,
    });
  }
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
  // JUMLAH BIAYA / TOTAL BIAYA / Dibulatkan — label rata kiri, nilai Rp rata kanan, semua sel berbingkai.
  for (let i = 0; i < 3; i++) {
    const rr = jumlahRow + i;
    for (let c = A; c <= G; c++) {
      setStyle(enc(rr, c), {
        font: { bold: true, sz: 10 },
        alignment: { horizontal: c === G ? "right" : "left", vertical: "center" },
        numFmt: c === G ? RP : undefined,
        border: BORDER,
      });
    }
  }
  // Terbilang — rata kiri, semua sel berbingkai.
  for (let c = A; c <= G; c++) {
    setStyle(enc(terbilangRow, c), {
      font: { bold: c === A, italic: c !== A, sz: 9 },
      alignment: { horizontal: "left", vertical: "top", wrapText: c !== A },
      border: BORDER,
    });
  }

  const sigText = [sig + 1, sig + 2, sig + 6, sig + 7, sig + 8];
  for (const rr of sigText) {
    const isName = rr === sig + 6;
    const isJab = rr === sig + 2;
    const st = {
      font: { sz: 9, bold: isName, underline: isName },
      alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: isJab },
    };
    setStyle(enc(rr, A), st);
    setStyle(enc(rr, E), { ...st, font: { ...st.font } });
  }

  // Merges
  const M = (r1: number, c1: number, r2: number, c2: number) => ({ s: { r: r1 - 1, c: c1 }, e: { r: r2 - 1, c: c2 } });
  const merges = [M(1, A, 1, G), M(2, A, 2, G)];
  for (let i = 0; i < hdrCount; i++) {
    const rr = hdrFirst + i;
    merges.push(M(rr, A, rr, B));
    merges.push(M(rr, D, rr, G));
  }
  for (let i = 0; i < 3; i++) merges.push(M(jumlahRow + i, A, jumlahRow + i, F));
  merges.push(M(terbilangRow, B, terbilangRow, G));
  for (const rr of sigText) {
    merges.push(M(rr, A, rr, C));
    merges.push(M(rr, E, rr, G));
  }
  ws["!merges"] = merges;

  ws["!rows"] = [];
  ws["!rows"][terbilangRow - 1] = { hpt: 26 };
  ws["!rows"][sig + 1] = { hpt: 28 }; // jabatan (0-based index = excel row sig+2)

  ws["!cols"] = [
    { wch: 16 }, { wch: 44 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 16 }, { wch: 18 },
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
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadOne(unit: RabUnit, ctx: Ctx, signers: Signers) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildRabSheet(unit, ctx, signers), safeSheetName(unit.sheetName));
  downloadWorkbook(wb, `RAB_${ctx.satkerKode || "Satker"}_${safeSheetName(unit.sheetName)}_TA${ctx.tahun}.xlsx`);
}

function downloadAll(units: RabUnit[], ctx: Ctx, signers: Signers, mode: Mode) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const u of units) {
    let name = safeSheetName(u.sheetName);
    let i = 2;
    while (used.has(name)) name = safeSheetName(u.sheetName + "_" + i++);
    used.add(name);
    XLSX.utils.book_append_sheet(wb, buildRabSheet(u, ctx, signers), name);
  }
  const tag = mode === "SUB" ? "SubKomponen" : "Komponen";
  downloadWorkbook(wb, `RAB_${ctx.satkerKode || "Satker"}_Semua_${tag}_TA${ctx.tahun}.xlsx`);
}

/* ───────────────────────── Cetak (HTML) ───────────────────────── */

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function printRab(unit: RabUnit, ctx: Ctx, signers: Signers) {
  const now = new Date();
  const tgl = `${signers.kota}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
  const ctxRow = (kode: string, ur: string, ind: number, b: boolean) =>
    `<tr style="${b ? "font-weight:bold" : ""}"><td class="mono">${esc(kode)}</td><td style="padding-left:${ind * 14}px">${esc(ur)}</td><td colspan="4"></td><td class="r">${fmtN(unit.total)}</td></tr>`;
  const lineRows = unit.lines.map((l) => {
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
  }).join("");
  const subHdr = unit.level === "SUB_KOMPONEN"
    ? `<tr><td>Sub Komponen</td><td>:</td><td>${esc(unit.subKode)} ${esc(unit.subUraian)}</td></tr>` : "";
  const subCtx = unit.level === "SUB_KOMPONEN" ? ctxRow(unit.subKode ?? "", unit.subUraian ?? "", 3, true) : "";
  const k = signers.kiri, n = signers.kanan;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>RAB ${esc(unit.sheetName)}</title>
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
  <tr><td>Program</td><td>:</td><td>${esc(unit.programUraian)}</td></tr>
  <tr><td>Keluaran (Output)</td><td>:</td><td>${esc(unit.roKode)} ${esc(unit.roUraian)}</td></tr>
  <tr><td>Komponen</td><td>:</td><td>${esc(unit.komponenKode)} ${esc(unit.komponenUraian)}</td></tr>
  ${subHdr}
  <tr><td>Alokasi Anggaran</td><td>:</td><td>Rp ${fmtN(unit.total)}</td></tr>
</table>
<table>
  <tr><th>Kode</th><th>Uraian</th><th>Rincian Perhitungan</th><th>Volume</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th></tr>
  ${ctxRow(unit.kroKode, unit.kroUraian, 0, false)}
  ${ctxRow(unit.roKode, unit.roUraian, 1, false)}
  ${ctxRow(unit.komponenKode, unit.komponenUraian, 2, true)}
  ${subCtx}
  ${lineRows}
  <tr style="font-weight:bold;background:#eee"><td colspan="6">JUMLAH BIAYA</td><td class="r">${fmtN(unit.total)}</td></tr>
</table>
<p><strong>Terbilang:</strong> <em>${esc(titleCase(terbilang(unit.total)))}</em></p>
<table class="sig">
  <tr><td>Mengetahui</td><td></td><td>${esc(tgl)}</td></tr>
  <tr><td>${esc(k.jabatan)}</td><td></td><td>${esc(n.jabatan)}</td></tr>
  <tr><td style="height:60px"></td><td></td><td></td></tr>
  <tr><td style="font-weight:bold;text-decoration:underline">${esc(k.nama)}</td><td></td><td style="font-weight:bold;text-decoration:underline">${esc(n.nama)}</td></tr>
  <tr><td>${esc(k.pangkat)}</td><td></td><td>${esc(n.pangkat)}</td></tr>
  <tr><td>NIP. ${esc(k.nip)}</td><td></td><td>NIP. ${esc(n.nip)}</td></tr>
</table>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}
