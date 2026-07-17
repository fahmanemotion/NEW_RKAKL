"use client";
import React from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Loader2, Save, DownloadCloud, Info } from "lucide-react";
import { TorIsiFields } from "@/components/tor/tor-isi-fields";
import { loadTorIsi, saveTorIsi, loadTorTemplate, type TorIsi } from "@/lib/tor-isi-api";

/** Apakah sebuah isi TOR punya narasi terisi (bukan sekadar kerangka kosong)? */
function adaNarasi(isi: TorIsi | null): boolean {
  return !!isi && Object.values(isi.narasi).some((t) => t && t.trim());
}
/** Salinan dalam — agar mengubah isian di sini tak pernah menyentuh objek template. */
function salin(isi: TorIsi): TorIsi {
  return {
    narasi: { ...isi.narasi },
    tahapan: isi.tahapan.map((t) => ({ ...t })),
    sumberDana: isi.sumberDana,
  };
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
  // true = isian saat ini berasal dari pustaka Referensi (belum disimpan ke usulan ini).
  const [fromTemplate, setFromTemplate] = React.useState(false);
  // Narasi pustaka (Referensi → NARASI TOR) untuk komponen ini; null bila belum ada.
  // Selalu diambil — bukan hanya saat isian kosong — agar tombol "Ambil dari
  // Referensi" tetap tersedia walau usulan ini sudah pernah diisi.
  const [tmpl, setTmpl] = React.useState<TorIsi | null>(null);

  React.useEffect(() => {
    if (!open || !komponen) return;
    setLoading(true);
    setErr(null);
    setFromTemplate(false);
    setTmpl(null);
    const nama = komponen.uraian;
    Promise.all([
      loadTorIsi(usulanId, komponen.id),
      loadTorTemplate(nama).catch(() => null),
    ])
      .then(([tersimpan, pustaka]) => {
        const adaPustaka = adaNarasi(pustaka);
        setTmpl(adaPustaka ? pustaka : null);
        // Usulan ini belum ada narasinya → langsung isi otomatis dari pustaka.
        if (!adaNarasi(tersimpan) && adaPustaka) {
          setIsi(salin(pustaka!));
          setFromTemplate(true);
          return;
        }
        setIsi(tersimpan);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, komponen, usulanId]);

  /** Tarik ulang narasi dari pustaka Referensi (menimpa isian di layar, bukan DB). */
  function ambilDariReferensi() {
    if (!tmpl) return;
    if (
      adaNarasi(isi) &&
      !confirm(
        "Isian di layar akan DIGANTI dengan narasi dari Referensi → NARASI TOR.\n\n" +
          "Yang tersimpan di usulan ini baru berubah setelah Anda menekan Simpan. " +
          "Pustaka di Referensi tidak akan ikut berubah.\n\nLanjutkan?",
      )
    )
      return;
    setIsi(salin(tmpl));
    setFromTemplate(true);
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
          {err ? (
            <span className="text-sm text-destructive">{err}</span>
          ) : tmpl ? (
            <Button variant="outline" onClick={ambilDariReferensi} disabled={busy || loading}>
              <DownloadCloud className="size-4" /> Ambil dari Referensi
            </Button>
          ) : (
            <span />
          )}
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
          {fromTemplate ? (
            <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              Terisi otomatis dari <strong>Referensi → NARASI TOR</strong>. Sesuaikan seperlunya, lalu{" "}
              <strong>Simpan</strong> untuk menyimpannya pada usulan ini. Perubahan di sini{" "}
              <strong>tidak mengubah</strong> pustaka di Referensi.
            </div>
          ) : tmpl ? (
            <div className="flex items-start gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Komponen ini punya narasi di <strong>Referensi → NARASI TOR</strong>. Isian di bawah
                adalah milik usulan ini. Tekan <strong>Ambil dari Referensi</strong> untuk menggantinya
                dengan narasi pustaka.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Belum ada narasi untuk komponen ini di <strong>Referensi → NARASI TOR</strong>. Isi di
                sana sekali agar tahun-tahun berikutnya terisi otomatis.
              </span>
            </div>
          )}
          <TorIsiFields isi={isi} setIsi={setIsi} />
        </div>
      )}
    </Modal>
  );
}
