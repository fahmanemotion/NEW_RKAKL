"use client";
import * as React from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Combobox: tombol pemilih + kotak cari + daftar digulir. Berbeda dari dropdown
 * filter, ia dipakai untuk MENGISI nilai. Bila `allowCustom`, teks yang diketik
 * boleh dipakai walau tak ada di daftar (mis. komponen yang belum ada di master).
 */
export function ComboBox({
  options,
  value,
  onChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ditemukan.",
  allowCustom = false,
  disabled = false,
  className,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [hi, setHi] = React.useState(0); // indeks tersorot (navigasi panah)
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [options, q]);

  // Teks bebas ditawarkan saat tak ada padanan persis.
  const custom = React.useMemo(() => {
    const s = q.trim();
    if (!allowCustom || !s) return null;
    return options.some((o) => o.toLowerCase() === s.toLowerCase()) ? null : s;
  }, [allowCustom, options, q]);

  const items = React.useMemo(
    () => (custom ? [{ label: custom, custom: true }, ...filtered.map((o) => ({ label: o, custom: false }))] : filtered.map((o) => ({ label: o, custom: false }))),
    [custom, filtered],
  );

  React.useEffect(() => setHi(0), [q, open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQ("");
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[hi]) pick(items[hi].label);
    }
  }

  // Jaga item tersorot tetap terlihat saat navigasi panah.
  React.useEffect(() => {
    const el = listRef.current?.children[hi] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [hi]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg">
          <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
            <Search className="size-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
            {items.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>}
            {items.map((it, i) => (
              <li key={`${it.custom ? "+" : ""}${it.label}`}>
                <button
                  type="button"
                  onClick={() => pick(it.label)}
                  onMouseEnter={() => setHi(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                    i === hi && "bg-accent",
                    it.label === value && "font-medium",
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", it.label === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">
                    {it.custom ? (
                      <>
                        Pakai: <strong>{it.label}</strong>{" "}
                        <span className="text-muted-foreground">(di luar daftar)</span>
                      </>
                    ) : (
                      it.label
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {options.length > 0 && (
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              {filtered.length} dari {options.length} komponen
            </div>
          )}
        </div>
      )}
    </div>
  );
}
