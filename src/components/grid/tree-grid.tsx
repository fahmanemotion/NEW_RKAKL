"use client";
import * as React from "react";
import type { GridRow } from "@/lib/tree";
import { fmtN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";

const SD_KODE: Record<string, string> = { RM: "A00", BLU: "F00", SBSN: "SBSN" };

export function TreeGrid({
  rows,
  selectedId,
  onSelect,
  meId,
  collapseActive = false,
  expandedKomp,
  expandableKomp,
  onToggleKomponen,
}: {
  rows: GridRow[];
  selectedId: string | null;
  onSelect: (row: GridRow) => void;
  meId?: string;
  collapseActive?: boolean;
  expandedKomp?: Set<string>;
  expandableKomp?: Set<string>;
  onToggleKomponen?: (row: GridRow) => void;
}) {
  return (
    <div
      className="overflow-auto rounded-md border border-border"
      style={{ maxHeight: "62vh" }}
    >
      <table className="saktigrid">
        <thead>
          <tr>
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
                colSpan={8}
                className="py-10 text-center text-muted-foreground"
              >
                Belum ada data. Mulai dengan <strong>Tambah KRO</strong>.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const cls = cn(
                "row-" + r.type.toLowerCase(),
                r.selectable && "selectable",
                r.id === selectedId && "is-selected",
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
              return (
                <tr
                  key={r.id}
                  className={cls}
                  onClick={() => r.selectable && onSelect(r)}
                  onDoubleClick={() => canExpand && onToggleKomponen?.(r)}
                  style={canExpand ? { cursor: "pointer" } : undefined}
                  title={canExpand ? "Klik 2x untuk buka/tutup rincian" : undefined}
                >
                  <td className="code-cell">{r.kode}</td>
                  <td className="ur" style={{ paddingLeft: 10 + r.depth * 16 }}>
                    {canExpand && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleKomponen?.(r);
                        }}
                        className="mr-1 inline-flex size-4 -translate-y-px items-center justify-center rounded text-muted-foreground hover:bg-accent"
                        aria-label={expanded ? "Tutup" : "Buka"}
                      >
                        {expanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
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
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
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
