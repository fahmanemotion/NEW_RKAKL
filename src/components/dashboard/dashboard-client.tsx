"use client";
import * as React from "react";
import {
  Search,
  ChevronRight,
  Loader2,
  Inbox,
  Wallet,
  Building2,
  Briefcase,
  Users2,
  Package,
  Hammer,
} from "lucide-react";
import { Card, Input, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { fetchAllStruktur } from "@/lib/fetch-struktur";
import { fmtRp, fmtN } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import type { UsulanStruktur } from "@/types/database";
import {
  buildDashboardRows,
  levelLabelMaps,
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

  const akunRows = React.useMemo(() => buildDashboardRows(rows), [rows]);
  const labels = React.useMemo(() => levelLabelMaps(rows), [rows]);

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

  const opt = (m: Map<string, string>) =>
    Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const needleDigits = needle.replace(/[^0-9]/g, "");
    return akunRows.filter((r) => {
      if (fProg !== ALL && r.progKode !== fProg) return false;
      if (fKro !== ALL && r.kroKode !== fKro) return false;
      if (fRo !== ALL && r.roKode !== fRo) return false;
      if (fKomponen !== ALL && r.komponenKode !== fKomponen) return false;
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

  return (
    <div className="space-y-6">
      {/* Header + pemilih Tahun & Tahap */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {satkerNama} — ringkasan usulan anggaran.
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
          {/* Ringkasan */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              icon={Wallet}
              color="text-blue-600"
              label="Total Pagu Usulan"
              value={sum.total}
              sub={`${sum.akunCount} akun`}
            />
            <SummaryCard
              icon={Building2}
              color="text-teal-600"
              label="Operasional (OPS)"
              value={sum.ops}
              sub={pctStr(sum.ops, sum.total)}
            />
            <SummaryCard
              icon={Briefcase}
              color="text-orange-600"
              label="Non Operasional (NON)"
              value={sum.non}
              sub={pctStr(sum.non, sum.total)}
            />
            <SummaryCard
              icon={Users2}
              color="text-cyan-600"
              label="Belanja Pegawai"
              value={sum.pegawai}
              sub={pctStr(sum.pegawai, sum.total)}
            />
            <SummaryCard
              icon={Package}
              color="text-emerald-600"
              label="Belanja Barang"
              value={sum.barang}
              sub={pctStr(sum.barang, sum.total)}
            />
            <SummaryCard
              icon={Hammer}
              color="text-amber-600"
              label="Belanja Modal"
              value={sum.modal}
              sub={pctStr(sum.modal, sum.total)}
            />
          </div>

          {/* Daftar Usulan Kegiatan */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="text-base font-semibold">Daftar Usulan Kegiatan</h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {filtered.length} akun
              </span>
            </div>

            {/* Filter strip */}
            <div className="flex flex-wrap items-end gap-2 border-b border-border bg-muted/40 p-3">
              <FilterSelect
                label="Program"
                value={fProg}
                onChange={setFProg}
                options={opt(labels.PROGRAM)}
              />
              <FilterSelect
                label="KRO"
                value={fKro}
                onChange={setFKro}
                options={opt(labels.KRO)}
              />
              <FilterSelect
                label="RO"
                value={fRo}
                onChange={setFRo}
                options={opt(labels.RO)}
              />
              <FilterSelect
                label="Komponen"
                value={fKomponen}
                onChange={setFKomponen}
                options={opt(labels.KOMPONEN)}
              />
              <FilterSelect
                label="Akun"
                value={fAkun}
                onChange={setFAkun}
                options={opt(labels.AKUN)}
              />
              <FilterSelect
                label="Sumber"
                value={fSumber}
                onChange={setFSumber}
                options={[
                  ["RM", "RM"],
                  ["BLU", "BLU"],
                  ["SBSN", "SBSN"],
                ]}
              />
              <FilterSelect
                label="Kategori"
                value={fKategori}
                onChange={setFKategori}
                options={[
                  ["OPS", "Operasional"],
                  ["NON", "Non Operasional"],
                ]}
              />
              <div className="flex-1" />
              <div className="flex h-9 min-w-[200px] items-center gap-2 rounded-md border border-input bg-card px-2.5">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Kode</th>
                    <th className="px-3 py-2.5 font-semibold">Uraian / Akun</th>
                    <th className="px-3 py-2.5 font-semibold">Sumber</th>
                    <th className="px-3 py-2.5 font-semibold">Kategori</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Pagu Usulan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center">
                        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-12 text-center text-muted-foreground"
                      >
                        <Inbox className="mx-auto mb-2 size-6" />
                        Tidak ada data ditemukan
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
                                    className={`size-3 transition-transform ${
                                      open ? "rotate-90" : ""
                                    }`}
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
                                <div className="text-[11px] text-muted-foreground">
                                  {r.context}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex flex-wrap gap-1">
                                {r.sumberSet.length ? (
                                  r.sumberSet.map((s) => (
                                    <SumberChip key={s} s={s} />
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex flex-wrap gap-1">
                                {r.kategoriSet.length ? (
                                  r.kategoriSet.map((k) => (
                                    <KategoriChip key={k} k={k} />
                                  ))
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
                              <tr
                                key={d.id}
                                className="border-b border-border bg-muted/30 text-xs"
                              >
                                <td className="px-3 py-1.5"></td>
                                <td className="px-3 py-1.5 pl-6 text-muted-foreground">
                                  <span className="mr-1 text-muted-foreground/60">
                                    ↳
                                  </span>
                                  {d.uraian}
                                  {d.volume != null && (
                                    <span className="ml-1 text-muted-foreground/70">
                                      ({fmtN(d.volume)} {d.satuan ?? ""} ×{" "}
                                      {fmtN(d.harga)})
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5">
                                  {d.sumber !== "-" ? (
                                    <SumberChip s={d.sumber} />
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-3 py-1.5">
                                  {d.kategori !== "-" ? (
                                    <KategoriChip k={d.kategori} />
                                  ) : (
                                    "—"
                                  )}
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
                {filtered.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                      <td className="px-3 py-2.5" colSpan={4}>
                        Total ({filtered.length} akun) · RM {fmtN(sum.rm)} · BLU{" "}
                        {fmtN(sum.blu)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {fmtN(sum.total)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{fmtRp(value)}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <Icon className={`size-7 ${color}`} />
      </div>
    </Card>
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
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-[120px] text-xs"
      >
        <option value={ALL}>Semua</option>
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {label === "Program" ||
            label === "KRO" ||
            label === "RO" ||
            label === "Akun"
              ? `${val}${lbl ? " — " + lbl : ""}`
              : lbl}
          </option>
        ))}
      </Select>
    </div>
  );
}

function pctStr(part: number, total: number): string {
  if (!total) return "0%";
  return ((part / total) * 100).toFixed(1) + "% dari total";
}
