"use client";
import * as React from "react";
import type { GridRow } from "@/lib/tree";
import { fmtN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Check } from "lucide-react";

const SD_KODE: Record<string, string> = { RM: "A00", BLU: "F00", SBSN: "SBSN" };

// Level yang boleh dicentang untuk salin massal.
const CHECKABLE = new Set(["SUB_KOMPONEN", "AKUN", "DETAIL"]);

export function TreeGrid({
  rows,
  selectedId,
  onSelect,
  meId,
  collapseActive = false,
  expandedKomp,
  expandableKomp,
  onToggleKomponen,
  checkedIds,
  onToggleCheck,
}: {
  rows: GridRow[];
  selectedId: string | null;
  onSelect: (row: GridRow) => void;
  meId?: string;
  collapseActive?: boolean;
  expandedKomp?: Set<string>;
  expandableKomp?: Set<string>;
  onToggleKomponen?: (row: GridRow) => void;
  checkedIds?: Set<string>;
  onToggleCheck?: (row: GridRow) => void;
}) {
  const showCheck = !!onToggleCheck;
  return (
    <div
      className="overflow-auto rounded-md border border-border"
      style={{ maxHeight: "62vh" }}
    >
      <table className="saktigrid">
        <thead>
          <tr>
            {showCheck && <th style={{ width: 34 }} title="Pilih untuk salin"></th>}
            <th style={{ width: 130 }}>KODE</th>
            <th>URAIAN</th>
            <th style={{ width: 70 }}>VOL</th>
            <th style={{ width: 64 }}>SAT</th>
            <th style={{ width: 110 }}>HARGA</th>
            <th style={{ width: 130 }}>JUMLAH</th>
            <th style={{ width: 44 }}>JNS</th>
            <th style={{ width: 52 }}>SD</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={showCheck ? 9 : 8}
                className="py-10 text-center text-muted-foreground"
              >
                Belum ada data. Mulai dengan <strong>Tambah KRO</strong>.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const lockedOther =
                r.type === "KRO" &&
                !!r.ref?.dikerjakan_oleh &&
                r.ref.dikerjakan_oleh !== meId;
              const ownedMine =
                r.type === "KRO" && r.ref?.dikerjakan_oleh === meId && !!meId;
              const cls = cn(
                "row-" + r.type.toLowerCase(),
                r.selectable && "selectable",
                r.id === selectedId && "is-selected",
                (checkedIds?.has(r.id) ?? false) &&
                  "bg-primary/10 outline outline-1 -outline-offset-1 outline-primary/20",
                lockedOther && "bg-orange-200/50 dark:bg-orange-900/30",
                ownedMine && "bg-emerald-100/50 dark:bg-emerald-900/20",
              );
              const sd =
                r.type === "AKUN" && r.sumber_dana
                  ? (SD_KODE[r.sumber_dana] ?? r.sumber_dana)
                  : "";
              const showNum = r.type === "DETAIL";
              const jns =
                r.type === "DETAIL" && r.jenis_belanja
                  ? r.jenis_belanja === "NON_OPS"
                    ? "NON"
                    : "OPS"
                  : "";
              const isKomp = r.type === "KOMPONEN";
              const canExpand =
                collapseActive && isKomp && (expandableKomp?.has(r.id) ?? false);
              const expanded = expandedKomp?.has(r.id) ?? false;
              const canCheck = showCheck && r.selectable && CHECKABLE.has(r.type);
              const checked = checkedIds?.has(r.id) ?? false;
              return (
                <tr
                  key={r.id}
                  className={cls}
                  onClick={() => r.selectable && onSelect(r)}
                  onDoubleClick={() => canExpand && onToggleKomponen?.(r)}
                  style={canExpand ? { cursor: "pointer" } : undefined}
                  title={canExpand ? "Klik 2x untuk buka/tutup rincian" : undefined}
                >
                  {showCheck && (
                    <td className="ctr">
                      {canCheck && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCheck?.(r);
                          }}
                          aria-label={checked ? "Batal pilih" : "Pilih"}
                          className={cn(
                            "inline-flex size-4 items-center justify-center rounded border align-middle",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background hover:border-primary",
                          )}
                        >
                          {checked && <Check className="size-3" strokeWidth={3} />}
                        </button>
                      )}
                    </td>
                  )}
                  <td className="code-cell">{r.kode}</td>
                  <td className="ur" style={{ paddingLeft: 10 + r.depth * 16 }}>
                    {canExpand && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleKomponen?.(r);
                        }}
                        className={cn(
                          "mr-1.5 inline-flex size-5 -translate-y-px items-center justify-center rounded border align-middle shadow-sm transition-colors",
                          expanded
                            ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                        )}
                        aria-label={expanded ? "Tutup" : "Buka"}
                        title={expanded ? "Tutup rincian" : "Buka rincian"}
                      >
                        {expanded ? (
                          <ChevronDown className="size-4" strokeWidth={2.5} />
                        ) : (
                          <ChevronRight className="size-4" strokeWidth={2.5} />
                        )}
                      </button>
                    )}
                    {r.uraian}
                    {r.type === "KRO" && r.ref?.dikerjakan_oleh_nama ? (
                      <span
                        className={cn(
                          "ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          r.ref.dikerjakan_oleh === meId
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-orange-200/80 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
                        )}
                        title={`Dikerjakan oleh ${r.ref.dikerjakan_oleh_nama}`}
                      >
                        🔒 {r.ref.dikerjakan_oleh === meId ? "Anda" : r.ref.dikerjakan_oleh_nama}
                      </span>
                    ) : null}
                  </td>
                  <td className="num">
                    {showNum && r.volume
                      ? fmtN(r.volume)
                      : (r.type === "KRO" || r.type === "RO") && r.volume
                        ? fmtN(r.volume)
                        : ""}
                  </td>
                  <td className="ctr">{r.satuan ?? ""}</td>
                  <td className="num">
                    {showNum && r.harga ? fmtN(r.harga) : ""}
                  </td>
                  <td className="num font-semibold">
                    {r.jumlah ? fmtN(r.jumlah) : ""}
                  </td>
                  <td className="ctr">{jns}</td>
                  <td className="ctr">{sd}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
