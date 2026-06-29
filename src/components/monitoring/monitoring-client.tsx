"use client";
import * as React from "react";
import {
  Inbox,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Wallet,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { Card, Select, Badge } from "@/components/ui";
import { fmtN, fmtRp } from "@/lib/constants";
import { STATUS_COLOR, type Status } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import {
  buildMonitoringRows,
  summarizeMonitoring,
  tahapDeltas,
  MON_TAHAP,
  type MonRow,
} from "@/lib/monitoring-data";

export interface MonUsulanInput {
  id: string;
  tahun: number;
  tahap: string;
  status: string;
  total: number;
  satkerId: string;
  satkerNama: string;
  satkerKode: string;
}

export function MonitoringClient({ usulan }: { usulan: MonUsulanInput[] }) {
  const years = React.useMemo(
    () =>
      Array.from(new Set(usulan.map((u) => u.tahun))).sort((a, b) => b - a),
    [usulan],
  );
  const [tahun, setTahun] = React.useState<number | null>(years[0] ?? null);

  const rows = React.useMemo(
    () => buildMonitoringRows(usulan.filter((u) => u.tahun === tahun)),
    [usulan, tahun],
  );
  const summary = React.useMemo(() => summarizeMonitoring(rows), [rows]);

  // Total pagu per tahap (lintas satker) untuk baris footer.
  const tahapTotals = React.useMemo(() => {
    const t: Record<string, number> = {};
    for (const tp of MON_TAHAP) {
      t[tp] = rows.reduce((s, r) => s + (r.cells[tp]?.total ?? 0), 0);
    }
    return t;
  }, [rows]);

  const noData = usulan.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Header hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border card-elevated bg-gradient-to-br from-[hsl(214_92%_46%)] via-[hsl(206_92%_40%)] to-[hsl(217_56%_24%)] text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Progres Anggaran
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Monitoring</h1>
            <p className="mt-1 text-sm text-white/85">
              Progres pagu lintas tahap per satuan kerja.
            </p>
            {tahun != null && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ring-white/20">
                TA {tahun}
              </span>
            )}
          </div>
          <div className="shrink-0">
            <label className="mb-1 block text-[11px] font-medium text-white/70">
              Tahun Anggaran
            </label>
            <Select
              value={tahun ?? ""}
              onChange={(e) => setTahun(Number(e.target.value))}
              disabled={years.length === 0}
              className="min-w-[130px] border-white/25 bg-white/15 text-white shadow-none backdrop-blur [&>option]:text-foreground"
            >
              {years.length === 0 && <option value="">—</option>}
              {years.map((y) => (
                <option key={y} value={y}>
                  TA {y}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {noData ? (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada usulan untuk dipantau.
          </p>
        </Card>
      ) : (
        <>
          {/* ── Kartu ringkasan ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={Building2}
              tint={TINTS.indigo}
              label="Satuan Kerja"
              value={fmtN(summary.satkerCount)}
            />
            <StatTile
              icon={Wallet}
              tint={TINTS.amber}
              label="Total Pagu Terkini"
              value={fmtRp(summary.totalPagu)}
              accent
            />
            <StatTile
              icon={CheckCircle2}
              tint={TINTS.emerald}
              label="Tahap Final"
              value={fmtN(summary.finalizedTahaps)}
            />
            <StatTile
              icon={Clock}
              tint={TINTS.sky}
              label="Tahap Berjalan"
              value={fmtN(summary.inProgressTahaps)}
            />
          </div>

          {/* ── Tabel progres ──────────────────────────────────────────── */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border p-4">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Layers className="size-4" />
              </span>
              <h2 className="text-base font-semibold">Progres per Satuan Kerja</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {fmtN(rows.length)}
              </span>
            </div>

            <div className="max-h-[64vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted">
                    <th className="px-3 py-2.5 font-semibold">Satuan Kerja</th>
                    {MON_TAHAP.map((t) => (
                      <th key={t} className="px-3 py-2.5 text-right font-semibold">
                        {TAHAP_LABEL[t as TahapPagu] ?? t}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center font-semibold">Progres</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <SatkerRow key={r.satkerId} row={r} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="sticky bottom-0 z-10 border-t-2 border-border bg-muted font-bold [&>td]:bg-muted">
                    <td className="px-3 py-2.5">TOTAL</td>
                    {MON_TAHAP.map((t) => (
                      <td
                        key={t}
                        className="px-3 py-2.5 text-right font-mono tabular-nums"
                      >
                        {tahapTotals[t] ? fmtN(tahapTotals[t]) : "—"}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── Komponen presentasional ─────────────────────────────────────────────── */

type Tint = { bg: string; fg: string };
const TINTS: Record<string, Tint> = {
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/40", fg: "text-indigo-600 dark:text-indigo-300" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", fg: "text-amber-600 dark:text-amber-300" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-300" },
  sky: { bg: "bg-sky-100 dark:bg-sky-900/40", fg: "text-sky-600 dark:text-sky-300" },
};

function StatTile({
  icon: Icon,
  tint,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: Tint;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`p-4 transition-shadow hover:shadow-md ${
        accent ? "ring-1 ring-amber-300/60 dark:ring-amber-500/30" : ""
      }`}
    >
      <span className={`grid size-9 place-items-center rounded-xl ${tint.bg} ${tint.fg}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 truncate text-[13px] text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 font-bold tabular-nums ${
          accent ? "text-xl text-amber-700 dark:text-amber-400" : "text-xl"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

function SatkerRow({ row }: { row: MonRow }) {
  const [open, setOpen] = React.useState(false);
  const deltas = React.useMemo(() => tahapDeltas(row), [row]);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent/40"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
            <div>
              <div className="font-medium">{row.satkerNama}</div>
              {row.satkerKode && (
                <div className="text-xs text-muted-foreground">{row.satkerKode}</div>
              )}
            </div>
          </div>
        </td>
        {MON_TAHAP.map((t) => {
          const c = row.cells[t];
          return (
            <td key={t} className="px-3 py-2.5 text-right">
              {c ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono tabular-nums">{fmtN(c.total)}</span>
                  <Badge
                    className={`${STATUS_COLOR[c.status as Status] ?? "bg-slate-100 text-slate-700"} text-[10px]`}
                  >
                    {c.status}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          );
        })}
        <td className="px-3 py-2.5">
          <ProgressDots count={row.finalizedCount} total={MON_TAHAP.length} />
        </td>
      </tr>

      {open && (
        <tr className="bg-muted/20">
          <td colSpan={MON_TAHAP.length + 2} className="px-4 py-3">
            <div className="space-y-3">
              {/* Bar perbandingan antar tahap */}
              <div className="space-y-1.5">
                {MON_TAHAP.map((t) => {
                  const c = row.cells[t];
                  const pct =
                    c && row.maxTotal > 0 ? (c.total / row.maxTotal) * 100 : 0;
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <div className="w-32 shrink-0 text-xs text-muted-foreground">
                        {TAHAP_LABEL[t as TahapPagu] ?? t}
                      </div>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${c ? "bg-primary/70" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-32 shrink-0 text-right font-mono text-xs tabular-nums">
                        {c ? fmtN(c.total) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selisih antar tahap */}
              {deltas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {deltas.map((d) => (
                    <div
                      key={`${d.from}-${d.to}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {TAHAP_LABEL[d.from as TahapPagu] ?? d.from} →{" "}
                        {TAHAP_LABEL[d.to as TahapPagu] ?? d.to}:
                      </span>
                      <DeltaTag delta={d.delta} pct={d.pct} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DeltaTag({ delta, pct }: { delta: number; pct: number | null }) {
  const up = delta > 0;
  const flat = delta === 0;
  const cls = flat
    ? "text-muted-foreground"
    : up
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${cls}`}>
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {fmtN(delta)}
      {pct != null && ` (${up ? "+" : ""}${pct.toFixed(1)}%)`}
    </span>
  );
}

function ProgressDots({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full ${i < count ? "bg-emerald-500" : "bg-muted-foreground/25"}`}
          title={`${count}/${total} tahap final`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {count}/{total}
      </span>
    </div>
  );
}
