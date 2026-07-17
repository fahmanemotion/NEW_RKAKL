"use client";
import React from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Loader2, Save } from "lucide-react";
import { TorIsiFields } from "@/components/tor/tor-isi-fields";
import { loadTorIsi, saveTorIsi, loadTorTemplate, type TorIsi } from "@/lib/tor-isi-api";

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
          <TorIsiFields isi={isi} setIsi={setIsi} />
        </div>
      )}
    </Modal>
  );
}
