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
} from "lucide-react";
import { Card, Select, Badge } from "@/components/ui";
import { fmtN } from "@/lib/constants";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Progres pagu lintas tahap per satuan kerja.
          </p>
        </div>
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
          {/* Kartu ringkasan */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              icon={<Building2 className="size-4" />}
              label="Satuan Kerja"
              value={String(summary.satkerCount)}
            />
            <SummaryCard
              icon={<Wallet className="size-4" />}
              label="Total Pagu Terkini"
              value={fmtN(summary.totalPagu)}
              accent
            />
            <SummaryCard
              icon={<CheckCircle2 className="size-4" />}
              label="Tahap Final"
              value={String(summary.finalizedTahaps)}
            />
            <SummaryCard
              icon={<Clock className="size-4" />}
              label="Tahap Berjalan"
              value={String(summary.inProgressTahaps)}
            />
          </div>

          {/* Tabel progres */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Satuan Kerja</th>
                    {MON_TAHAP.map((t) => (
                      <th
                        key={t}
                        className="px-3 py-2 text-right font-semibold"
                      >
                        {TAHAP_LABEL[t as TahapPagu] ?? t}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold">
                      Progres
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <SatkerRow key={r.satkerId} row={r} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold">
                    <td className="px-3 py-2">TOTAL</td>
                    {MON_TAHAP.map((t) => (
                      <td
                        key={t}
                        className="px-3 py-2 text-right font-mono tabular-nums"
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

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 font-bold tabular-nums ${accent ? "text-lg text-amber-700 dark:text-amber-400" : "text-lg"}`}
      >
        {value}
      </div>
    </Card>
  );
}

function SatkerRow({ row }: { row: MonRow }) {
  const [open, setOpen] = React.useState(false);
  const deltas = React.useMemo(() => tahapDeltas(row), [row]);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/30"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
            <div>
              <div className="font-medium">{row.satkerNama}</div>
              {row.satkerKode && (
                <div className="text-xs text-muted-foreground">
                  {row.satkerKode}
                </div>
              )}
            </div>
          </div>
        </td>
        {MON_TAHAP.map((t) => {
          const c = row.cells[t];
          return (
            <td key={t} className="px-3 py-2 text-right">
              {c ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono tabular-nums">
                    {fmtN(c.total)}
                  </span>
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
        <td className="px-3 py-2">
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
                    c && row.maxTotal > 0
                      ? (c.total / row.maxTotal) * 100
                      : 0;
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <div className="w-32 shrink-0 text-xs text-muted-foreground">
                        {TAHAP_LABEL[t as TahapPagu] ?? t}
                      </div>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className={`h-full rounded ${c ? "bg-primary/70" : ""}`}
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
