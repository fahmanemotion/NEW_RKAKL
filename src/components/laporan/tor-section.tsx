"use client";
import * as React from "react";
import { FileText, Download, Loader2, Inbox, ChevronRight, ChevronsUpDown, Check, Search, Pencil, Eye, Save } from "lucide-react";
import { Button, Card, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { listTorKomponen, buildTorForKomponen, normKomp, type TorKomponenItem } from "@/lib/tor-data";
import { saveTorTemplateForUsulan, listTorTemplateKeys } from "@/lib/tor-isi-api";
import { generateTorDocx, downloadBlob } from "@/lib/tor-generate";
import { TorEditor } from "@/components/laporan/tor-editor";
import { TorPreviewModal } from "@/components/laporan/tor-preview";

interface ComboOpt {
  value: string;
  label: string;
}

/**
 * Dropdown pencari generik (combobox): kotak cari + daftar digulir + centang
 * pilihan + footer jumlah. Baris "Semua" selalu di atas untuk mereset.
 */
function SearchCombo({
  options,
  value,
  onChange,
  allLabel,
}: {
  options: ComboOpt[];
  value: string; // "" = semua
  onChange: (v: string) => void;
  allLabel: string;
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
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
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
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  const current = options.find((o) => o.value === value);
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="truncate">{current ? current.label : allLabel}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-[min(560px,92vw)] overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg">
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
            <li>
              <button
                type="button"
                onClick={() => pick("")}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                  value === "" && "bg-accent/60 font-medium",
                )}
              >
                <Check className={cn("size-3.5 shrink-0", value === "" ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{allLabel}</span>
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan.</li>
            )}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                    o.value === value && "bg-accent/60 font-medium",
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-1 text-[11px] text-muted-foreground">
            {filtered.length} dari {options.length} item
          </div>
        </div>
      )}
    </div>
  );
}

export interface TorUsulanOpt {
  id: string;
  tahun: number;
  tahap: string;
  satkerNama: string;
}

export function TorSection({ usulanList }: { usulanList: TorUsulanOpt[] }) {
  const [usulanId, setUsulanId] = React.useState<string>(usulanList[0]?.id ?? "");
  const [items, setItems] = React.useState<TorKomponenItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [kroFilter, setKroFilter] = React.useState<string>(""); // "" = semua
  const [kompFilter, setKompFilter] = React.useState<string>(""); // "" = semua
  const [editKomp, setEditKomp] = React.useState<TorKomponenItem | null>(null);
  const [preview, setPreview] = React.useState<{ blob: Blob; filename: string } | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState<string | null>(null);
  // Template isi TOR (reusable lintas usulan): status simpan + kunci yang sudah punya template.
  const [savingTmpl, setSavingTmpl] = React.useState(false);
  const [tmplMsg, setTmplMsg] = React.useState<string | null>(null);
  const [tmplKeys, setTmplKeys] = React.useState<Set<string>>(new Set());

  const refreshTmplKeys = React.useCallback(() => {
    listTorTemplateKeys().then(setTmplKeys).catch(() => {});
  }, []);
  React.useEffect(() => {
    refreshTmplKeys();
  }, [refreshTmplKeys]);

  async function onSaveTemplate() {
    if (!usulanId || items.length === 0) return;
    // Menulis BALIK ke pustaka Referensi → NARASI TOR. Ini satu-satunya jalur
    // dari Laporan yang mengubah pustaka, jadi harus disengaja: penyimpanan
    // narasi biasa (tombol Simpan di form Isi TOR) tidak pernah menyentuhnya.
    if (
      !confirm(
        "Naikkan narasi usulan ini menjadi acuan di Referensi → NARASI TOR?\n\n" +
          "Narasi pustaka untuk komponen bernama sama akan DITIMPA, dan itu menjadi " +
          "isian otomatis bagi usulan/tahun berikutnya.\n\n" +
          "Narasi usulan tahun lain tidak terpengaruh. Lanjutkan?",
      )
    )
      return;
    setSavingTmpl(true);
    setTmplMsg(null);
    setErr(null);
    try {
      const { saved } = await saveTorTemplateForUsulan(
        usulanId,
        items.map((i) => ({ id: i.id, uraian: i.uraian })),
      );
      setTmplMsg(
        saved > 0
          ? `${saved} komponen tersimpan sebagai template — bisa dipakai ulang di PAGU/tahun berikutnya.`
          : "Belum ada narasi terisi untuk disimpan. Klik “Isi” pada komponen dan simpan narasinya dulu.",
      );
      refreshTmplKeys();
    } catch (e) {
      setErr("Gagal menyimpan template: " + (e as Error).message);
    } finally {
      setSavingTmpl(false);
    }
  }

  React.useEffect(() => {
    if (!usulanId) {
      setItems([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setErr(null);
    setKroFilter("");
    setKompFilter("");
    setTmplMsg(null);
    listTorKomponen(usulanId)
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((e) => alive && setErr((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [usulanId]);

  async function onPreview(k: TorKomponenItem) {
    setPreviewBusy(k.id);
    setErr(null);
    try {
      const { tokens, logo, filename, rab, narasi, tahapan } = await buildTorForKomponen(usulanId, k.id);
      const blob = generateTorDocx(tokens, logo, rab, narasi, tahapan);
      setPreview({ blob, filename });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPreviewBusy(null);
    }
  }

  async function onDownload(k: TorKomponenItem) {
    setBusyId(k.id);
    setErr(null);
    try {
      const { tokens, logo, filename, rab, narasi, tahapan } = await buildTorForKomponen(usulanId, k.id);
      const blob = generateTorDocx(tokens, logo, rab, narasi, tahapan);
      downloadBlob(blob, filename);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // Opsi KRO unik (induk filter).
  const kroOptions = React.useMemo(() => {
    const seen = new Map<string, { id: string; kode: string; uraian: string }>();
    for (const it of items) {
      if (it.kroId && !seen.has(it.kroId))
        seen.set(it.kroId, { id: it.kroId, kode: it.kroKode, uraian: it.kroUraian });
    }
    return [...seen.values()].sort((a, b) =>
      a.kode.localeCompare(b.kode, "id", { numeric: true, sensitivity: "base" }),
    );
  }, [items]);

  // Opsi Komponen mengikuti KRO terpilih.
  const kompOptions = React.useMemo(
    () => items.filter((it) => !kroFilter || it.kroId === kroFilter),
    [items, kroFilter],
  );

  // Daftar TOR akhir = tersaring oleh KRO + Komponen.
  const filtered = React.useMemo(
    () =>
      items.filter(
        (it) => (!kroFilter || it.kroId === kroFilter) && (!kompFilter || it.id === kompFilter),
      ),
    [items, kroFilter, kompFilter],
  );

  return (
    <Card className="border-t-4 border-t-amber-400 bg-amber-50/50 p-4 dark:border-t-amber-500 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
          <FileText className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Cetak TOR / KAK per Komponen</h2>
          <p className="text-xs text-muted-foreground">
            Menghasilkan dokumen Word (hal. 1–2: sampul &amp; tabel identitas) otomatis per komponen.
          </p>
        </div>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Pilih Usulan</span>
        <Select value={usulanId} onChange={(e) => setUsulanId(e.target.value)} className="w-full max-w-lg">
          <option value="">— pilih usulan —</option>
          {usulanList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.satkerNama} · TA {u.tahun} · {u.tahap}
            </option>
          ))}
        </Select>
      </label>

      {items.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-300/60 bg-amber-100/40 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/20">
          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={onSaveTemplate} disabled={savingTmpl}>
            {savingTmpl ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Simpan sebagai Template
          </Button>
          <span className="text-xs text-muted-foreground">
            Opsional — <strong>menimpa</strong> pustaka di Referensi → NARASI TOR dengan narasi usulan ini,
            agar dipakai ulang pada PAGU/tahun berikutnya. Menyimpan narasi biasa tidak mengubah pustaka.
          </span>
          {tmplMsg && (
            <span className="w-full text-xs font-medium text-emerald-700 dark:text-emerald-400 sm:ml-auto sm:w-auto">
              {tmplMsg}
            </span>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Filter KRO</span>
            <SearchCombo
              options={kroOptions.map((k) => ({ value: k.id, label: `${k.kode} — ${k.uraian}` }))}
              value={kroFilter}
              onChange={(v) => {
                setKroFilter(v);
                setKompFilter(""); // reset komponen saat KRO berubah
              }}
              allLabel="Semua KRO"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Filter Komponen</span>
            <SearchCombo
              options={kompOptions.map((k) => ({
                value: k.id,
                label: `${k.roKode} · ${k.kode} — ${k.uraian}`,
              }))}
              value={kompFilter}
              onChange={setKompFilter}
              allLabel="Semua Komponen"
            />
          </label>
        </div>
      )}

      {err && <p className="mb-2 text-xs text-destructive">{err}</p>}

      <div className="rounded-xl border border-border">
        {loading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Inbox className="size-6" />
            {usulanId ? "Tidak ada komponen sesuai filter." : "Pilih usulan untuk menampilkan komponen."}
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {filtered.map((k) => (
              <li key={k.id} className="flex items-center gap-2 px-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{k.kode}</span>
                    <span className="truncate font-medium">{k.uraian}</span>
                    {tmplKeys.has(normKomp(k.uraian)) && (
                      <span
                        className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-medium leading-none text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                        title="Ada template narasi tersimpan untuk komponen ini — akan dimuat otomatis saat Isi kosong"
                      >
                        template
                      </span>
                    )}
                  </div>
                  {(k.kroUraian || k.roUraian) && (
                    <div className="flex items-center gap-1 truncate text-[10px] leading-tight text-muted-foreground">
                      <span className="truncate">{k.kroUraian}</span>
                      {k.roUraian && <ChevronRight className="size-2.5 shrink-0" />}
                      <span className="truncate">{k.roUraian}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2"
                  onClick={() => setEditKomp(k)}
                >
                  <Pencil className="size-3.5" /> Isi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2"
                  onClick={() => onPreview(k)}
                  disabled={previewBusy === k.id}
                >
                  {previewBusy === k.id ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                  Pratinjau
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2"
                  onClick={() => onDownload(k)}
                  disabled={busyId === k.id}
                >
                  {busyId === k.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  TOR
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {filtered.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{filtered.length} komponen ditampilkan.</p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Catatan: hal. 1–2 otomatis. Klik <span className="font-medium">Isi</span> untuk mengetik narasi tiap bagian,
        mengatur matriks Kurun Waktu, dan memilih sumber dana (RM/BLU) sebelum mengunduh TOR.
      </p>
      <TorEditor
        open={!!editKomp}
        onClose={() => setEditKomp(null)}
        usulanId={usulanId}
        komponen={editKomp ? { id: editKomp.id, kode: editKomp.kode, uraian: editKomp.uraian } : null}
      />
      <TorPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        blob={preview?.blob ?? null}
        filename={preview?.filename ?? "TOR.docx"}
      />
    </Card>
  );
}
