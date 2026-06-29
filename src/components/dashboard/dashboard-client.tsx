"use client";
import * as React from "react";
import {
  Search,
  ChevronRight,
  Loader2,
  Inbox,
  AlertTriangle,
  Wallet,
  Building2,
  Briefcase,
  Users2,
  Package,
  Hammer,
  RotateCcw,
  Layers,
} from "lucide-react";
import { Card, Input, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { fetchAllStruktur } from "@/lib/fetch-struktur";
import { fmtRp, fmtN } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import type { UsulanStruktur } from "@/types/database";
import {
  buildDashboardRows,
  summarize,
  type DashAkunRow,
} from "@/lib/dashboard-data";

export interface UsulanRingkas {
  id: string;
  tahun: number;
  tahap: string; // TahapPagu
  status: string;
  total: number;
}

const ALL = "__all__";

function SumberChip({ s }: { s: string }) {
  const cls =
    s === "BLU"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      : s === "SBSN"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}
    >
      {s}
    </span>
  );
}

function KategoriChip({ k }: { k: string }) {
  const cls =
    k === "NON"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
      : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}
    >
      {k}
    </span>
  );
}

export function DashboardClient({
  usulanList,
  satkerNama,
}: {
  usulanList: UsulanRingkas[];
  satkerNama: string;
}) {
  // ── Tahun & Tahap ───────────────────────────────────────────────────────
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

  // Saat tahun berganti, set tahap ke pilihan pertama yang tersedia.
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

  // ── Muat struktur usulan terpilih ───────────────────────────────────────
  const [rows, setRows] = React.useState<UsulanStruktur[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!usulan) {
      setRows([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadErr(null);
    fetchAllStruktur(createClient(), usulan.id)
      .then((data) => {
        if (!alive) return;
        setRows(data as UsulanStruktur[]);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        console.error("Gagal memuat struktur usulan:", e);
        setRows([]);
        setLoadErr(
          (e as { message?: string })?.message ??
            "Gagal memuat data usulan. Coba muat ulang halaman.",
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [usulan]);

  const akunRows = React.useMemo(() => buildDashboardRows(rows), [rows]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const [fProg, setFProg] = React.useState(ALL);
  const [fKro, setFKro] = React.useState(ALL);
  const [fRo, setFRo] = React.useState(ALL);
  const [fKomponen, setFKomponen] = React.useState(ALL);
  const [fAkun, setFAkun] = React.useState(ALL);
  const [fSumber, setFSumber] = React.useState(ALL);
  const [fKategori, setFKategori] = React.useState(ALL);
  const [q, setQ] = React.useState("");

  // Reset filter ketika usulan berganti.
  React.useEffect(() => {
    setFProg(ALL);
    setFKro(ALL);
    setFRo(ALL);
    setFKomponen(ALL);
    setFAkun(ALL);
    setFSumber(ALL);
    setFKategori(ALL);
    setQ("");
  }, [usulan]);

  const opt = (m: Map<string, string> | undefined) =>
    m ? Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])) : [];

  // Opsi filter BERTINGKAT (cascading): setiap filter anak hanya menampilkan
  // nilai yang masih relevan dengan pilihan induknya. Memilih Program otomatis
  // mempersempit KRO → RO → Komponen → Akun mengikuti data terpilih.
  const cascade = React.useMemo(() => {
    const progM = new Map<string, string>();
    const kroM = new Map<string, string>();
    const roM = new Map<string, string>();
    const kompM = new Map<string, string>();
    const akunM = new Map<string, string>();
    const lbl = (kode: string, uraian: string) =>
      uraian ? `${kode} — ${uraian}` : kode;
    for (const r of akunRows) {
      if (r.progKode) progM.set(r.progKode, lbl(r.progKode, r.progUraian));
      const okProg = fProg === ALL || r.progKode === fProg;
      if (okProg && r.kroKey) kroM.set(r.kroKey, lbl(r.kroKode, r.kroLabel));
      const okKro = okProg && (fKro === ALL || r.kroKey === fKro);
      if (okKro && r.roKey) roM.set(r.roKey, lbl(r.roKode, r.roLabel));
      const okRo = okKro && (fRo === ALL || r.roKey === fRo);
      if (okRo && r.komponenKey)
        kompM.set(r.komponenKey, lbl(r.komponenKode, r.komponenLabel));
      const okKomp = okRo && (fKomponen === ALL || r.komponenKey === fKomponen);
      if (okKomp && r.akunKode) akunM.set(r.akunKode, lbl(r.akunKode, r.akunUraian));
    }
    return { progM, kroM, roM, kompM, akunM };
  }, [akunRows, fProg, fKro, fRo, fKomponen]);

  // Saat induk berubah, kosongkan pilihan anak agar tidak ada filter "yatim".
  const onProg = (v: string) => { setFProg(v); setFKro(ALL); setFRo(ALL); setFKomponen(ALL); setFAkun(ALL); };
  const onKro = (v: string) => { setFKro(v); setFRo(ALL); setFKomponen(ALL); setFAkun(ALL); };
  const onRo = (v: string) => { setFRo(v); setFKomponen(ALL); setFAkun(ALL); };
  const onKomponen = (v: string) => { setFKomponen(v); setFAkun(ALL); };

  // Status & aksi reset filter (UI).
  const anyFilter =
    fProg !== ALL || fKro !== ALL || fRo !== ALL || fKomponen !== ALL ||
    fAkun !== ALL || fSumber !== ALL || fKategori !== ALL || q.trim() !== "";
  const resetFilters = () => {
    setFProg(ALL); setFKro(ALL); setFRo(ALL); setFKomponen(ALL);
    setFAkun(ALL); setFSumber(ALL); setFKategori(ALL); setQ("");
  };

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const needleDigits = needle.replace(/[^0-9]/g, "");
    return akunRows.filter((r) => {
      if (fProg !== ALL && r.progKode !== fProg) return false;
      if (fKro !== ALL && r.kroKey !== fKro) return false;
      if (fRo !== ALL && r.roKey !== fRo) return false;
      if (fKomponen !== ALL && r.komponenKey !== fKomponen) return false;
      if (fAkun !== ALL && r.akunKode !== fAkun) return false;
      if (fSumber !== ALL && !r.sumberSet.includes(fSumber)) return false;
      if (fKategori !== ALL && !r.kategoriSet.includes(fKategori)) return false;
      if (needle) {
        const hay = `${r.kode} ${r.akunUraian} ${r.context}`.toLowerCase();
        const matchText = hay.includes(needle);
        const matchNum =
          needleDigits.length > 0 &&
          (String(Math.round(r.pagu)).includes(needleDigits) ||
            r.details.some((d) =>
              String(Math.round(d.pagu)).includes(needleDigits),
            ));
        if (!matchText && !matchNum) return false;
      }
      return true;
    });
  }, [akunRows, fProg, fKro, fRo, fKomponen, fAkun, fSumber, fKategori, q]);

  const sum = React.useMemo(() => summarize(filtered), [filtered]);

  // ── Expand baris ─────────────────────────────────────────────────────────
  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const noUsulan = usulanList.length === 0;
  const tahapLabel = tahap ? (TAHAP_LABEL[tahap as TahapPagu] ?? tahap) : "—";
  const statusNow = usulan?.status ?? null;

  return (
    <div className="space-y-6">
      {/* ── Header hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border card-elevated bg-gradient-to-br from-[hsl(214_92%_46%)] via-[hsl(206_92%_40%)] to-[hsl(217_56%_24%)] text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Ringkasan Anggaran
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
              {satkerNama}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 font-medium ring-1 ring-inset ring-white/20">
                TA {tahun ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 font-medium ring-1 ring-inset ring-white/20">
                {tahapLabel}
              </span>
              {statusNow && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 ring-1 ring-inset ring-white/15">
                  <span className="size-1.5 rounded-full bg-emerald-300" />
                  {statusNow}
                </span>
              )}
            </div>
          </div>

          {/* Pemilih Tahun & Tahap pada permukaan kaca */}
          <div className="flex shrink-0 flex-wrap items-end gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/70">
                Tahun Anggaran
              </label>
              <Select
                value={tahun ?? ""}
                onChange={(e) => setTahun(Number(e.target.value))}
                disabled={years.length === 0}
                className="min-w-[120px] border-white/25 bg-white/15 text-white shadow-none backdrop-blur placeholder:text-white/60 [&>option]:text-foreground"
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
              <label className="mb-1 block text-[11px] font-medium text-white/70">
                Tahap Pagu
              </label>
              <Select
                value={tahap ?? ""}
                onChange={(e) => setTahap(e.target.value)}
                disabled={tahapList.length === 0}
                className="min-w-[190px] border-white/25 bg-white/15 text-white shadow-none backdrop-blur [&>option]:text-foreground"
              >
                {tahapList.length === 0 && <option value="">—</option>}
                {tahapList.map((u) => (
                  <option key={u.id} value={u.tahap}>
                    {TAHAP_LABEL[u.tahap as TahapPagu] ?? u.tahap} · {u.status}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>

      {noUsulan ? (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada usulan anggaran. Mulai menyusun di menu{" "}
            <span className="font-medium text-primary">Penganggaran</span>.
          </p>
        </Card>
      ) : (
        <>
          {/* ── Ringkasan ──────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Kartu utama: total + komposisi */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="size-4" />
                    </span>
                    Total Pagu Usulan
                  </div>
                  <p className="mt-3 text-3xl font-bold tabular-nums sm:text-4xl">
                    {fmtRp(sum.total)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fmtN(sum.akunCount)} akun
                    {anyFilter && " (sesuai filter)"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sum.rm > 0 && (
                    <SourcePill label="RM" value={sum.rm} total={sum.total} cls="text-blue-600 dark:text-blue-300" />
                  )}
                  {sum.blu > 0 && (
                    <SourcePill label="BLU" value={sum.blu} total={sum.total} cls="text-violet-600 dark:text-violet-300" />
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <CompositionBar
                  title="Kategori"
                  total={sum.total}
                  segments={[
                    { label: "Operasional", value: sum.ops, cls: "bg-teal-500" },
                    { label: "Non Operasional", value: sum.non, cls: "bg-orange-500" },
                  ]}
                />
                <CompositionBar
                  title="Jenis Belanja"
                  total={sum.total}
                  segments={[
                    { label: "Pegawai", value: sum.pegawai, cls: "bg-cyan-500" },
                    { label: "Barang", value: sum.barang, cls: "bg-emerald-500" },
                    { label: "Modal", value: sum.modal, cls: "bg-amber-500" },
                  ]}
                />
              </div>
            </Card>

            {/* Tile rincian */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <StatTile icon={Building2} tint={TINTS.teal} label="Operasional" value={sum.ops} total={sum.total} />
              <StatTile icon={Briefcase} tint={TINTS.orange} label="Non Operasional" value={sum.non} total={sum.total} />
              <StatTile icon={Users2} tint={TINTS.cyan} label="Belanja Pegawai" value={sum.pegawai} total={sum.total} />
              <StatTile icon={Package} tint={TINTS.emerald} label="Belanja Barang" value={sum.barang} total={sum.total} />
              <StatTile icon={Hammer} tint={TINTS.amber} label="Belanja Modal" value={sum.modal} total={sum.total} />
            </div>
          </div>

          {/* ── Daftar Usulan Kegiatan ─────────────────────────────────── */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Layers className="size-4" />
                </span>
                <h2 className="text-base font-semibold">Daftar Usulan Kegiatan</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {fmtN(filtered.length)}
                </span>
              </div>
              {filtered.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {sum.rm > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
                      <span className="font-medium text-muted-foreground">RM</span>
                      <span className="font-mono font-semibold tabular-nums">{fmtN(sum.rm)}</span>
                    </span>
                  )}
                  {sum.blu > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
                      <span className="font-medium text-muted-foreground">BLU</span>
                      <span className="font-mono font-semibold tabular-nums">{fmtN(sum.blu)}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 ring-1 ring-primary/20">
                    <span className="font-semibold text-primary">Total</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-primary">{fmtN(sum.total)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Filter strip */}
            <div className="flex flex-wrap items-end gap-2 border-b border-border bg-muted/40 p-3">
              <FilterSelect label="Program" value={fProg} onChange={onProg} options={opt(cascade.progM)} />
              <FilterSelect label="KRO" value={fKro} onChange={onKro} options={opt(cascade.kroM)} />
              <FilterSelect label="RO" value={fRo} onChange={onRo} options={opt(cascade.roM)} />
              <FilterSelect label="Komponen" value={fKomponen} onChange={onKomponen} options={opt(cascade.kompM)} />
              <FilterSelect label="Akun" value={fAkun} onChange={setFAkun} options={opt(cascade.akunM)} />
              <FilterSelect
                label="Sumber"
                value={fSumber}
                onChange={setFSumber}
                options={[["RM", "RM"], ["BLU", "BLU"], ["SBSN", "SBSN"]]}
              />
              <FilterSelect
                label="Kategori"
                value={fKategori}
                onChange={setFKategori}
                options={[["OPS", "Operasional"], ["NON", "Non Operasional"]]}
              />
              <div className="flex-1" />
              {anyFilter && (
                <button
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </button>
              )}
              <div className="flex h-9 min-w-[200px] items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari KODE, uraian, atau nilai…"
                  className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Tabel */}
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted">
                    <th className="px-3 py-2.5 font-semibold">Kode</th>
                    <th className="px-3 py-2.5 font-semibold">Uraian / Akun</th>
                    <th className="px-3 py-2.5 font-semibold">Sumber</th>
                    <th className="px-3 py-2.5 font-semibold">Kategori</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Pagu Usulan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center">
                        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : loadErr ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-sm text-destructive">
                        <AlertTriangle className="mx-auto mb-2 size-6" />
                        {loadErr}
                      </td>
                    </tr>
                  ) : !usulan ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">
                        <Inbox className="mx-auto mb-2 size-6" />
                        Pilih Tahun &amp; Tahap Pagu untuk menampilkan usulan.
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">
                        <Inbox className="mx-auto mb-2 size-6" />
                        {akunRows.length === 0
                          ? "Usulan ini belum memiliki data anggaran."
                          : "Tidak ada data yang cocok dengan filter."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const open = openIds.has(r.id);
                      const hasDetails = r.details.length > 0;
                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            onClick={() => hasDetails && toggle(r.id)}
                            className={`border-b border-border transition-colors hover:bg-accent/50 ${
                              hasDetails ? "cursor-pointer" : ""
                            }`}
                          >
                            <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                {hasDetails && (
                                  <ChevronRight
                                    className={`size-3 transition-transform ${open ? "rotate-90" : ""}`}
                                  />
                                )}
                                {r.kode || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="font-medium leading-snug">
                                {r.akunKode} — {r.akunUraian}
                              </div>
                              {r.context && (
                                <div className="text-[11px] text-muted-foreground">{r.context}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex flex-wrap gap-1">
                                {r.sumberSet.length ? (
                                  r.sumberSet.map((s) => <SumberChip key={s} s={s} />)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex flex-wrap gap-1">
                                {r.kategoriSet.length ? (
                                  r.kategoriSet.map((k) => <KategoriChip key={k} k={k} />)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums">
                              {fmtN(r.pagu)}
                            </td>
                          </tr>
                          {open &&
                            r.details.map((d) => (
                              <tr key={d.id} className="border-b border-border bg-muted/30 text-xs">
                                <td className="px-3 py-1.5"></td>
                                <td className="px-3 py-1.5 pl-6 text-muted-foreground">
                                  <span className="mr-1 text-muted-foreground/60">↳</span>
                                  {d.uraian}
                                  {d.volume != null && (
                                    <span className="ml-1 text-muted-foreground/70">
                                      ({fmtN(d.volume)} {d.satuan ?? ""} × {fmtN(d.harga)})
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5">
                                  {d.sumber !== "-" ? <SumberChip s={d.sumber} /> : "—"}
                                </td>
                                <td className="px-3 py-1.5">
                                  {d.kategori !== "-" ? <KategoriChip k={d.kategori} /> : "—"}
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                                  {fmtN(d.pagu)}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── Komponen presentasional ─────────────────────────────────────────────── */

type Tint = { bg: string; fg: string; bar: string };
const TINTS: Record<string, Tint> = {
  teal: { bg: "bg-teal-100 dark:bg-teal-900/40", fg: "text-teal-600 dark:text-teal-300", bar: "bg-teal-500" },
  orange: { bg: "bg-orange-100 dark:bg-orange-900/40", fg: "text-orange-600 dark:text-orange-300", bar: "bg-orange-500" },
  cyan: { bg: "bg-cyan-100 dark:bg-cyan-900/40", fg: "text-cyan-600 dark:text-cyan-300", bar: "bg-cyan-500" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", fg: "text-amber-600 dark:text-amber-300", bar: "bg-amber-500" },
};

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return ((part / total) * 100).toFixed(1) + "%";
}

function StatTile({
  icon: Icon,
  tint,
  label,
  value,
  total,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: Tint;
  label: string;
  value: number;
  total: number;
}) {
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className={`grid size-9 place-items-center rounded-xl ${tint.bg} ${tint.fg}`}>
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {share > 0 ? pct(value, total) : "—"}
        </span>
      </div>
      <p className="mt-3 truncate text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{fmtRp(value)}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tint.bar} transition-[width] duration-500`}
          style={{ width: `${Math.min(share, 100)}%` }}
        />
      </div>
    </Card>
  );
}

function CompositionBar({
  title,
  segments,
  total,
}: {
  title: string;
  segments: { label: string; value: number; cls: string }[];
  total: number;
}) {
  const t = total || 1;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.label}
              className={s.cls}
              style={{ width: `${(s.value / t) * 100}%` }}
              title={`${s.label}: ${fmtRp(s.value)}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${s.cls}`} />
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{pct(s.value, total)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SourcePill({
  label,
  value,
  total,
  cls,
}: {
  label: string;
  value: number;
  total: number;
  cls: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${cls}`}>{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{pct(value, total)}</span>
      </div>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{fmtN(value)}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-[120px] text-xs"
      >
        <option value={ALL}>Semua</option>
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </Select>
    </div>
  );
}
