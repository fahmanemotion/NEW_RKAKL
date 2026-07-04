"use client";
import * as React from "react";
import { FileText, Download, Loader2, Inbox, ChevronRight } from "lucide-react";
import { Button, Card, Select } from "@/components/ui";
import { listTorKomponen, buildTorForKomponen, type TorKomponenItem } from "@/lib/tor-data";
import { generateTorDocx, downloadBlob } from "@/lib/tor-generate";

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

  async function onDownload(k: TorKomponenItem) {
    setBusyId(k.id);
    setErr(null);
    try {
      const { tokens, logo, filename } = await buildTorForKomponen(usulanId, k.id);
      const blob = generateTorDocx(tokens, logo);
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
    return [...seen.values()].sort((a, b) => a.kode.localeCompare(b.kode));
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
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
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
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Filter KRO</span>
            <Select
              value={kroFilter}
              onChange={(e) => {
                setKroFilter(e.target.value);
                setKompFilter(""); // reset komponen saat KRO berubah
              }}
              className="w-full"
            >
              <option value="">Semua KRO</option>
              {kroOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kode} — {k.uraian}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Filter Komponen</span>
            <Select value={kompFilter} onChange={(e) => setKompFilter(e.target.value)} className="w-full">
              <option value="">Semua Komponen</option>
              {kompOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kode} — {k.uraian}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}

      {err && <p className="mb-2 text-xs text-destructive">{err}</p>}

      <div className="overflow-hidden rounded-xl border border-border">
        {loading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Inbox className="size-6" />
            {usulanId ? "Belum ada komponen pada usulan ini." : "Pilih usulan untuk menampilkan komponen."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="font-mono text-xs text-muted-foreground">{k.kode}</span>
                    <span className="truncate">{k.uraian}</span>
                  </div>
                  {(k.kroUraian || k.roUraian) && (
                    <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <span className="truncate">{k.kroUraian}</span>
                      {k.roUraian && <ChevronRight className="size-3 shrink-0" />}
                      <span className="truncate">{k.roUraian}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownload(k)} disabled={busyId === k.id}>
                  {busyId === k.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  TOR
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Catatan: hal. 1–2 sudah otomatis. Bagian yang belum terisi (mis. Indikator KRO/RO, narasi hal. 3+) akan kita
        lengkapi bertahap.
      </p>
    </Card>
  );
}
