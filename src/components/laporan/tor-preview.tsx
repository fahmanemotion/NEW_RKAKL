"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { downloadBlob } from "@/lib/tor-generate";

/** Modal pratinjau dokumen TOR: merender blob .docx menjadi HTML (docx-preview). */
export function TorPreviewModal({
  open,
  onClose,
  blob,
  filename,
}: {
  open: boolean;
  onClose: () => void;
  blob: Blob | null;
  filename: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !blob) return;
    let cancelled = false;
    const el = ref.current;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (cancelled || !el) return;
        el.innerHTML = "";
        await renderAsync(blob, el, undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          experimental: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
      } catch (e) {
        if (!cancelled) setErr((e as Error).message || "Gagal merender pratinjau.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, blob]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-5xl"
      title="Pratinjau Dokumen TOR"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="max-w-[45%] truncate text-xs text-muted-foreground">{filename}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={() => blob && downloadBlob(blob, filename)} disabled={!blob}>
              <Download className="size-4" /> Unduh
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative max-h-[72vh] min-h-[40vh] overflow-auto rounded-md bg-neutral-200/60 p-4 dark:bg-neutral-800">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/60 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Menyiapkan pratinjau…
          </div>
        )}
        {err && (
          <div className="flex items-center gap-2 p-6 text-sm text-destructive">
            <AlertTriangle className="size-4" /> {err}
          </div>
        )}
        {/* docx-preview menaruh halaman .docx di sini */}
        <div ref={ref} className="mx-auto [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper>section.docx]:mx-auto [&_.docx-wrapper>section.docx]:mb-4 [&_.docx-wrapper>section.docx]:shadow-md" />
      </div>
    </Modal>
  );
}
