"use client";
import * as React from "react";
import type XLSXTypes from "xlsx-js-style";
type XLSXModule = typeof import("xlsx-js-style");
import { loadXLSXStyle } from "@/lib/xlsx-lazy";
import { Eye, Download, Layers, ChevronsUpDown, Check, Search } from "lucide-react";
import { Card, Select, Button } from "@/components/ui";
import { RabPreviewModal } from "@/components/laporan/rab-preview";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { fmtN } from "@/lib/constants";
import {
  buildRabPerKomponen,
  buildRabPerSubKomponen,
  rincianText,
  rincianCells,
  terbilang,
  titleCase,
  rabFileCode,
  safeFileName,
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
  tanggal?: Date; // bila kosong → pakai hari ini
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

const unitOptionText = (u: RabUnit): string =>
  `${u.roKode} · ${u.sheetName} — ${labelOf(u)} (${fmtN(u.total)})`;

/**
 * Combobox komponen/sub komponen: bisa diketik untuk mencari, daftar
 * digulir dengan tinggi maksimal (tidak lagi memanjang ke bawah walau item
 * ratusan). Menggantikan <select> native yang popup-nya bisa sangat panjang.
 */
function UnitCombo({
  units,
  value,
  onChange,
  placeholder,
}: {
  units: RabUnit[];
  value: number;
  onChange: (i: number) => void;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = units.map((u, i) => ({ u, i }));
    if (!s) return list;
    return list.filter(({ u }) => unitOptionText(u).toLowerCase().includes(s));
  }, [units, q]);

  const current = units[value];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full min-w-[300px] max-w-[460px] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="truncate">{current ? unitOptionText(current) : placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-[min(460px,92vw)] overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg">
          <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
            <Search className="size-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kode / uraian…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan.</li>
            )}
            {filtered.map(({ u, i }) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => { onChange(i); setOpen(false); setQ(""); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                    i === value && "bg-accent/60 font-medium",
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", i === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{unitOptionText(u)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-1 text-[11px] text-muted-foreground">
            {filtered.length} dari {units.length} item
          </div>
        </div>
      )}
    </div>
  );
}

export function RabSection({ rows, ctx }: { rows: KKRow[]; ctx: Ctx }) {
  const [mode, setMode] = React.useState<Mode>("SUB");
  const units = React.useMemo(
    () => (mode === "SUB" ? buildRabPerSubKomponen(rows) : buildRabPerKomponen(rows)),
    [rows, mode],
  );
  // Daftar program (untuk memfilter dropdown komponen).
  const programs = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) m.set(u.programKode || u.programUraian, u.programUraian);
    return [...m.entries()].map(([kode, nama]) => ({ kode, nama }));
  }, [units]);
  const [programFilter, setProgramFilter] = React.useState("ALL");
  const filteredUnits = React.useMemo(
    () =>
      programFilter === "ALL"
        ? units
        : units.filter((u) => (u.programKode || u.programUraian) === programFilter),
    [units, programFilter],
  );
  const [sel, setSel] = React.useState(0);
  const [zipping, setZipping] = React.useState(false);
  const [preview, setPreview] = React.useState<{ html: string; title: string; unit: RabUnit } | null>(null);
  React.useEffect(() => setSel(0), [filteredUnits]);

  interface PersonRow { id: string; nama: string; jabatan: string; pangkat: string; nip: string }
  const [people, setPeople] = React.useState<PersonRow[]>([]);
  const [kiriId, setKiriId] = React.useState("");
  const [kananId, setKananId] = React.useState("");
  // Pengaturan tempat & tanggal RAB (dari menu Referensi → Tempat & Tgl)
  const [kotaRab, setKotaRab] = React.useState(DEFAULT_SIGNERS.kota);
  const [tglRab, setTglRab] = React.useState<string>(""); // ISO yyyy-mm-dd, "" = hari ini
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb
          .from("pengaturan_rab")
          .select("kota, tanggal")
          .eq("id", 1)
          .maybeSingle();
        if (!alive || !data) return;
        if (data.kota) setKotaRab(data.kota);
        setTglRab(data.tanggal ?? "");
      } catch {
        /* pakai default */
      }
    })();
    return () => { alive = false; };
  }, []);
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
  const unit = filteredUnits[Math.min(sel, filteredUnits.length - 1)] ?? filteredUnits[0] ?? units[0];
  const toSigner = (p: PersonRow): Signer => ({ nama: p.nama, jabatan: p.jabatan, pangkat: p.pangkat, nip: p.nip });
  const kiriP = people.find((p) => p.id === kiriId);
  const kananP = people.find((p) => p.id === kananId);
  const signers: Signers = {
    kiri: kiriP ? toSigner(kiriP) : DEFAULT_SIGNERS.kiri,
    kanan: kananP ? toSigner(kananP) : DEFAULT_SIGNERS.kanan,
    kota: kotaRab,
    tanggal: tglRab ? new Date(tglRab + "T00:00:00") : undefined,
  };

  return (
    <Card className="overflow-hidden border-t-4 border-t-violet-400 bg-violet-50/50 dark:border-t-violet-500 dark:bg-violet-950/20">
      <div className="flex flex-col gap-2 border-b border-violet-200/70 px-4 py-2.5 dark:border-violet-900">
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
          {programs.length > 1 && (
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Program</span>
              <Select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="min-w-[220px]"
              >
                <option value="ALL">Semua Program</option>
                {programs.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.kode ? `${p.kode} — ` : ""}{p.nama}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">{mode === "SUB" ? "Sub Komponen" : "Komponen"}</span>
            <UnitCombo
              units={filteredUnits}
              value={Math.min(sel, Math.max(0, filteredUnits.length - 1))}
              onChange={(i) => setSel(i)}
              placeholder="— pilih —"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const XLSX = await loadXLSXStyle();
              setPreview({ html: buildRabPreviewHtml(XLSX, unit, ctx, signers), title: unit.sheetName, unit });
            }}
          >
            <Eye className="size-4" /> Pratinjau
          </Button>
          <Button size="sm" variant="outline" onClick={async () => { const XLSX = await loadXLSXStyle(); downloadOne(XLSX, unit, ctx, signers); }}>
            <Download className="size-4" /> Unduh ini
          </Button>
          <Button
            size="sm"
            disabled={zipping}
            onClick={async () => {
              setZipping(true);
              try {
                const XLSX = await loadXLSXStyle();
                await downloadAll(XLSX, filteredUnits, ctx, signers, mode);
              } finally {
                setZipping(false);
              }
            }}
            title="Unduh semua sebagai file terpisah, tiap file dinamai dengan kodenya (mis. 3996.AEC.002.051.A.xlsx)"
          >
            <Layers className="size-4" /> {zipping ? "Mengunduh…" : "Unduh Semua"}
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
      <RabPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        html={preview?.html ?? null}
        title={preview?.title}
        onDownload={
          preview
            ? async () => {
                const XLSX = await loadXLSXStyle();
                downloadOne(XLSX, preview.unit, ctx, signers);
              }
            : undefined
        }
      />
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
  segments: { qty: number; sat: string }[] | null;
  vol: number | null; satuan: string | null; harga: number | null; jumlah: number;
};

function buildRabSheet(XLSX: XLSXModule, unit: RabUnit, ctx: Ctx, signers: Signers): XLSXTypes.WorkSheet {
  // Kolom 0-based A..T (20). "Rincian Perhitungan" dipecah C..P: 5 pasang
  // (qty, satuan) dipisah "x" → C,D|E|F,G|H|I,J|K|L,M|N|O,P.
  const A = 0, B = 1;
  const C = 2, D = 3, E = 4, F = 5, G = 6, H = 7, I = 8, J = 9, K = 10, L = 11,
    Mm = 12, Nn = 13, O = 14, P = 15;
  const Q = 16, R = 17, S = 18, T = 19;
  const NC = 20;
  const RIN = [C, D, E, F, G, H, I, J, K, L, Mm, Nn, O, P]; // 14 kolom rincian
  const aoa: (string | number | null)[][] = [];
  const er = () => new Array(NC).fill(null);
  const now = signers.tanggal ?? new Date();
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
  const alokasiRow = aoa.length;
  aoa.push(er());

  const headRow = aoa.length;
  r = er();
  r[A] = "Kode"; r[B] = "Uraian"; r[C] = "Rincian Perhitungan";
  r[Q] = "Volume"; r[R] = "Satuan"; r[S] = "Harga Satuan"; r[T] = "Jumlah";
  aoa.push(r);

  const emit: Emit[] = [];
  const ctxRow = (id: string, pid: string | null, kode: string, uraian: string, level: string) =>
    emit.push({ id, pid, kode, uraian, level, isDetail: false, rincian: "", segments: null, vol: null, satuan: null, harga: null, jumlah: unit.total });
  ctxRow("__kro", null, unit.kroKode, unit.kroUraian, "KRO");
  ctxRow("__ro", "__kro", unit.roKode, unit.roUraian, "RO");
  ctxRow(unit.komponenId, "__ro", unit.komponenKode, unit.komponenUraian, "KOMPONEN");
  if (unit.level === "SUB_KOMPONEN")
    ctxRow(unit.id, unit.komponenId, unit.subKode ?? "", unit.subUraian ?? "", "SUB_KOMPONEN");
  for (const l of unit.lines) {
    emit.push({
      id: l.id, pid: l.parentId, kode: l.kode, uraian: l.uraian, level: l.level,
      isDetail: l.isDetail, rincian: l.isDetail ? rincianText(l) : "",
      segments: l.segments, vol: l.vol, satuan: l.satuan, harga: l.harga, jumlah: l.jumlah,
    });
  }

  const rowOf = new Map<string, number>();
  const dataStart = aoa.length + 1;
  emit.forEach((e, i) => rowOf.set(e.id, dataStart + i));

  for (const e of emit) {
    r = er();
    r[A] = e.isDetail ? "" : e.kode;
    r[B] = "  ".repeat(indentFor(e.level)) + (e.isDetail ? "- " : "") + e.uraian;
    if (e.level === "AKUN") {
      // Mini-header 5 pasang kolom rincian pada baris akun.
      r[C] = "Vol"; r[D] = "sat"; r[F] = "vol"; r[G] = "sat"; r[I] = "vol";
      r[J] = "sat"; r[L] = "vol"; r[Mm] = "sat"; r[O] = "vol"; r[P] = "sat";
      r[E] = "x"; r[H] = "x"; r[K] = "x"; r[Nn] = "x";
    }
    if (e.isDetail) {
      const rc = rincianCells(e.segments, e.vol, e.satuan); // 14 nilai C..P
      RIN.forEach((col, idx) => {
        if (rc[idx] != null && rc[idx] !== "") r[col] = rc[idx] as string | number;
      });
      if (e.vol != null) r[Q] = e.vol;
      r[R] = e.satuan ? titleCase(e.satuan) : "";
      if (e.harga != null) r[S] = e.harga;
    }
    r[T] = e.jumlah || null;
    aoa.push(r);
  }

  const jumlahRow = aoa.length + 1;
  r = er(); r[A] = "JUMLAH BIAYA"; r[T] = unit.total; aoa.push(r);
  r = er(); r[A] = "TOTAL BIAYA"; r[T] = unit.total; aoa.push(r);
  r = er(); r[A] = "Dibulatkan"; r[T] = unit.total; aoa.push(r);
  const terbilangRow = aoa.length + 1;
  r = er(); r[A] = "Terbilang :"; r[B] = titleCase(terbilang(unit.total)); aoa.push(r);
  aoa.push(er()); aoa.push(er());

  // Tanda tangan (kiri kolom A, kanan kolom P; tanggal di kolom P baris pertama)
  const sig = aoa.length;
  const k = signers.kiri, n = signers.kanan;
  r = er(); r[A] = "Mengetahui"; r[P] = tgl; aoa.push(r);
  r = er(); r[A] = k.jabatan; r[P] = n.jabatan; aoa.push(r);
  aoa.push(er()); aoa.push(er()); aoa.push(er());
  r = er(); r[A] = k.nama; r[P] = n.nama; aoa.push(r);
  r = er(); r[A] = k.pangkat; r[P] = n.pangkat; aoa.push(r);
  r = er(); r[A] = "NIP. " + k.nip; r[P] = "NIP. " + n.nip; aoa.push(r);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const enc = (row1: number, col0: number) => XLSX.utils.encode_cell({ r: row1 - 1, c: col0 });
  const cl = (c: number) => XLSX.utils.encode_col(c);

  // Rumus: detail = ROUNDDOWN(Volume*Harga,-3); induk = SUM anak.
  const childrenRows = new Map<string, number[]>();
  for (const e of emit) {
    if (!e.pid) continue;
    const arr = childrenRows.get(e.pid) ?? [];
    arr.push(rowOf.get(e.id)!);
    childrenRows.set(e.pid, arr);
  }
  for (const e of emit) {
    const row1 = rowOf.get(e.id)!;
    const a = enc(row1, T);
    if (e.isDetail) {
      if (e.vol != null && e.harga != null && e.vol > 0 && e.harga > 0)
        ws[a] = { t: "n", f: `ROUNDDOWN(${cl(Q)}${row1}*${cl(S)}${row1},-3)`, v: e.jumlah };
      else ws[a] = { t: "n", v: e.jumlah };
    } else {
      const kids = childrenRows.get(e.id) ?? [];
      if (kids.length)
        ws[a] = { t: "n", f: kids.map((cr) => `${cl(T)}${cr}`).join("+"), v: e.jumlah };
    }
  }
  const kompRow = rowOf.get(unit.komponenId)!;
  for (let i = 0; i < 3; i++)
    ws[enc(jumlahRow + i, T)] = { t: "n", f: `${cl(T)}${kompRow}`, v: unit.total };

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
  for (let c = 0; c < NC; c++) {
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
    for (let c = 0; c < NC; c++) {
      const isMoney = c === Q || c === S || c === T;
      const isRincian = c >= C && c <= P;
      setStyle(enc(row1, c), {
        font: { sz: 9, bold },
        fill: { patternType: "solid", fgColor: { rgb: fill } },
        alignment: {
          horizontal: c === B ? "left" : isMoney ? "right" : isRincian ? "left" : "center",
          vertical: "center",
        },
        border: BORDER,
        numFmt: isMoney ? MONEY : undefined,
      });
    }
  });
  for (let i = 0; i < 3; i++) {
    const rr = jumlahRow + i;
    for (let c = A; c <= T; c++) {
      setStyle(enc(rr, c), {
        font: { bold: true, sz: 10 },
        alignment: { horizontal: c === T ? "right" : "left", vertical: "center" },
        numFmt: c === T ? RP : undefined,
        border: BORDER,
      });
    }
  }
  for (let c = A; c <= T; c++) {
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
    setStyle(enc(rr, P), { ...st, font: { ...st.font } });
  }

  // Merges
  const Mg = (r1: number, c1: number, r2: number, c2: number) => ({ s: { r: r1 - 1, c: c1 }, e: { r: r2 - 1, c: c2 } });
  const merges = [Mg(1, A, 1, T), Mg(2, A, 2, T)];
  for (let i = 0; i < hdrCount; i++) {
    const rr = hdrFirst + i;
    merges.push(Mg(rr, A, rr, B));
    merges.push(Mg(rr, D, rr, T));
  }
  merges.push(Mg(headRow + 1, C, headRow + 1, P));
  for (let i = 0; i < 3; i++) merges.push(Mg(jumlahRow + i, A, jumlahRow + i, S));
  merges.push(Mg(terbilangRow, B, terbilangRow, T));
  for (const rr of sigText) {
    merges.push(Mg(rr, A, rr, I));
    merges.push(Mg(rr, P, rr, T));
  }
  ws["!merges"] = merges;

  ws["!rows"] = [];
  ws["!rows"][terbilangRow - 1] = { hpt: 26 };
  ws["!rows"][sig + 1] = { hpt: 28 };

  ws["!cols"] = [
    { wch: 16 }, { wch: 44 },
    { wch: 5 }, { wch: 8 }, { wch: 3 }, { wch: 5 }, { wch: 8 }, { wch: 3 },
    { wch: 5 }, { wch: 8 }, { wch: 3 }, { wch: 5 }, { wch: 8 }, { wch: 3 },
    { wch: 5 }, { wch: 8 },
    { wch: 6 }, { wch: 8 }, { wch: 16 }, { wch: 18 },
  ];
  return ws;


}

function safeSheetName(s: string): string {
  return (s || "RAB").replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "RAB";
}

function downloadWorkbook(XLSX: XLSXModule, wb: XLSXTypes.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadOne(XLSX: XLSXModule, unit: RabUnit, ctx: Ctx, signers: Signers) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildRabSheet(XLSX, unit, ctx, signers), safeSheetName(unit.sheetName));
  // Nama file = kode RAB (mis. 3996.AEC.002.051.A.xlsx) agar langsung dikenali.
  downloadWorkbook(XLSX, wb, `${safeFileName(rabFileCode(unit))}.xlsx`);
}

async function downloadAll(XLSX: XLSXModule, units: RabUnit[], ctx: Ctx, signers: Signers, _mode: Mode) {
  // Tanpa dependensi tambahan: unduh SATU file .xlsx per unit secara berurutan,
  // masing-masing dinamai dengan kodenya (mis. 3996.AEC.002.051.A.xlsx) sehingga
  // mudah dikenali tanpa membuka satu per satu. Browser akan meminta izin
  // "mengunduh beberapa berkas" sekali; setelah diizinkan, semuanya terunduh.
  const used = new Set<string>();
  for (const u of units) {
    const base = safeFileName(rabFileCode(u));
    let name = `${base}.xlsx`;
    let i = 2;
    while (used.has(name)) name = `${base}_${i++}.xlsx`;
    used.add(name);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildRabSheet(XLSX, u, ctx, signers), safeSheetName(u.sheetName));
    downloadWorkbook(XLSX, wb, name);
    // Jeda kecil agar unduhan beruntun tidak diblokir/ditimpa browser.
    await new Promise((res) => setTimeout(res, 300));
  }
}

/* ───────────────────────── Cetak (HTML) ───────────────────────── */

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

// Pratinjau RAB dibangun dari workbook yang SAMA dengan unduhan (buildRabSheet),
// lalu dirender via sheet_to_html — sehingga isi & tata letak pratinjau identik
// dengan file .xlsx yang diunduh (bukan lagi HTML terpisah).
function buildRabPreviewHtml(XLSX: XLSXModule, unit: RabUnit, ctx: Ctx, signers: Signers): string {
  const ws = buildRabSheet(XLSX, unit, ctx, signers);
  const table = XLSX.utils.sheet_to_html(ws, { header: "", footer: "" });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:14px;font-family:Arial,Helvetica,sans-serif;color:#111}
    table{border-collapse:collapse}
    td{border:1px solid #cbd5e1;padding:2px 6px;font-size:11px;vertical-align:top;white-space:nowrap}
    tr:first-child td{background:#e2e8f0;font-weight:700;text-align:center}
  </style></head><body>${table}</body></html>`;
}
