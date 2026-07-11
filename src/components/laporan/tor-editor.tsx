"use client";
import React from "react";
import { Button, Input, Select } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { TOR_SECTIONS, wordTargets } from "@/lib/tor-ai-sections";
import { loadTorIsi, saveTorIsi, loadTorTemplate, DEFAULT_TAHAPAN, type TorIsi, type TorTahapanRow } from "@/lib/tor-isi-api";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
function countWords(s: string): number {
  const t = (s || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

export function TorEditor({
  open,
  onClose,
  usulanId,
  komponen,
}: {
  open: boolean;
  onClose: () => void;
  usulanId: string;
  komponen: { id: string; kode: string; uraian: string } | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [isi, setIsi] = React.useState<TorIsi>({ narasi: {}, tahapan: [], sumberDana: "RM" });
  // true = isi diambil dari TEMPLATE (belum tersimpan utk usulan ini).
  const [fromTemplate, setFromTemplate] = React.useState(false);

  React.useEffect(() => {
    if (!open || !komponen) return;
    setLoading(true);
    setErr(null);
    setFromTemplate(false);
    const nama = komponen.uraian;
    loadTorIsi(usulanId, komponen.id)
      .then(async (loaded) => {
        const hasContent = Object.values(loaded.narasi).some((tx) => tx && tx.trim());
        // Isi usulan ini masih kosong → coba muat dari TEMPLATE (komponen bernama sama).
        if (!hasContent) {
          const tmpl = await loadTorTemplate(nama).catch(() => null);
          if (tmpl && Object.values(tmpl.narasi).some((tx) => tx && tx.trim())) {
            setIsi(tmpl);
            setFromTemplate(true);
            return;
          }
        }
        setIsi(loaded);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, komponen, usulanId]);

  function setNarasi(id: string, v: string) {
    setIsi((s) => ({ ...s, narasi: { ...s.narasi, [id]: v } }));
  }
  function setTahapan(i: number, patch: Partial<TorTahapanRow>) {
    setIsi((s) => ({ ...s, tahapan: s.tahapan.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  }
  function addTahapan() {
    setIsi((s) => ({ ...s, tahapan: [...s.tahapan, { nama: "", bulan_mulai: 1, bulan_selesai: 1 }] }));
  }
  function delTahapan(i: number) {
    setIsi((s) => ({ ...s, tahapan: s.tahapan.filter((_, j) => j !== i) }));
  }

  async function onSave() {
    if (!komponen) return;
    setBusy(true);
    setErr(null);
    try {
      await saveTorIsi(usulanId, komponen.id, isi);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-3xl"
      title={
        komponen ? (
          <span>
            Isi TOR — <span className="font-normal text-muted-foreground">{komponen.kode} {komponen.uraian}</span>
          </span>
        ) : (
          "Isi TOR"
        )
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          {err ? <span className="text-sm text-destructive">{err}</span> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button onClick={onSave} disabled={busy || loading}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Memuat…
        </div>
      ) : (
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          {fromTemplate && (
            <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              Dimuat dari <strong>template tersimpan</strong> (komponen bernama sama pada usulan lain).
              Sesuaikan bila perlu, lalu <strong>Simpan</strong> untuk menyimpannya pada usulan ini.
            </div>
          )}
          {/* Sumber dana */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Sumber dana (Bagian Biaya):</label>
            <Select
              value={isi.sumberDana}
              onChange={(e) => setIsi((s) => ({ ...s, sumberDana: e.target.value }))}
              className="w-56"
            >
              <option value="RM">RM — Rupiah Murni</option>
              <option value="BLU">BLU — PNBP/BLU</option>
            </Select>
          </div>

          {/* Narasi per bagian */}
          {TOR_SECTIONS.map((s) => {
            const w = wordTargets(s.pages);
            const n = countWords(isi.narasi[s.id] ?? "");
            const kurang = n > 0 && n < w.min;
            return (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {s.no}. {s.title}
                  </span>
                  <span className={`text-xs ${kurang ? "text-amber-600" : "text-muted-foreground"}`}>
                    {n} kata · target {w.min}–{w.max} (± {s.pages} hlm)
                  </span>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{s.guidance}</p>
                <textarea
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder={`Tulis ${s.title.toLowerCase()}…`}
                  value={isi.narasi[s.id] ?? ""}
                  onChange={(e) => setNarasi(s.id, e.target.value)}
                />
                {s.verifyRequired && (
                  <p className="mt-1 text-xs text-amber-600">
                    Perlu diverifikasi manusia (mis. nomor/tahun peraturan).
                  </p>
                )}
              </div>
            );
          })}

          {/* Matriks Kurun Waktu */}
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Matriks Kurun Waktu (Bagian D)</span>
              <Button variant="outline" onClick={addTahapan} className="h-8 px-2 text-xs">
                <Plus className="size-3.5" /> Tahapan
              </Button>
            </div>
            {isi.tahapan.length === 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                Belum ada tahapan.{" "}
                <button className="underline" onClick={() => setIsi((s) => ({ ...s, tahapan: DEFAULT_TAHAPAN.map((x) => ({ ...x })) }))}>
                  Pakai default
                </button>
                .
              </p>
            )}
            <div className="space-y-2">
              {isi.tahapan.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-40 flex-1"
                    placeholder="Nama tahapan"
                    value={t.nama}
                    onChange={(e) => setTahapan(i, { nama: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">bulan</span>
                  <Select className="w-20" value={String(t.bulan_mulai)} onChange={(e) => setTahapan(i, { bulan_mulai: Number(e.target.value) })}>
                    {BULAN.map((b, m) => (
                      <option key={m} value={m + 1}>{b}</option>
                    ))}
                  </Select>
                  <span className="text-xs text-muted-foreground">s/d</span>
                  <Select className="w-20" value={String(t.bulan_selesai)} onChange={(e) => setTahapan(i, { bulan_selesai: Number(e.target.value) })}>
                    {BULAN.map((b, m) => (
                      <option key={m} value={m + 1}>{b}</option>
                    ))}
                  </Select>
                  {/* mini pratinjau bulan */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 12 }, (_, m) => {
                      const on = m + 1 >= t.bulan_mulai && m + 1 <= t.bulan_selesai;
                      return <span key={m} className={`h-4 w-2.5 rounded-sm ${on ? "bg-primary" : "bg-muted"}`} title={BULAN[m]} />;
                    })}
                  </div>
                  <button className="rounded p-1 text-destructive hover:bg-destructive/10" onClick={() => delTahapan(i)} aria-label="Hapus">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
