"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { downloadBlob } from "@/lib/tor-generate";

/**
 * docx-preview tidak merender grup drawing (wpg) pada cover, sehingga logo &
 * bingkai/garis cover tak muncul. Fungsi ini menambalnya KHUSUS untuk pratinjau:
 * mengambil logo dari berkas .docx lalu menempelkannya di halaman pertama beserta
 * bingkai. Tidak mengubah dokumen yang diunduh.
 */
async function decorateCover(host: HTMLElement, blob: Blob) {
  try {
    const PizZip = (await import("pizzip")).default;
    const zip = new PizZip(await blob.arrayBuffer());
    // Pilih gambar terbesar di media sebagai logo (abaikan placeholder mungil).
    let logoName = "";
    let logoSize = 0;
    for (const path of Object.keys(zip.files)) {
      if (/^word\/media\/.*\.(png|jpe?g)$/i.test(path)) {
        const f = zip.file(path);
        const sz = f ? f.asBinary().length : 0;
        if (sz > logoSize) {
          logoSize = sz;
          logoName = path;
        }
      }
    }
    const page = host.querySelector("section") as HTMLElement | null;
    if (!page) return;
    page.style.position = "relative";

    // Bingkai cover (garis) — inset disamakan dgn dokumen unduhan (~12% sisi, ~8% atas, ~11% bawah).
    const frame = document.createElement("div");
    frame.style.cssText =
      "position:absolute;top:8%;left:12%;right:12%;bottom:11%;border:1.5px solid #111;border-radius:14px;pointer-events:none;z-index:0;";
    page.insertBefore(frame, page.firstChild);

    // Logo (atas-tengah) — posisi & ukuran disamakan dgn dokumen unduhan.
    if (logoName && logoSize > 200) {
      const ext = /\.png$/i.test(logoName) ? "png" : "jpeg";
      const url = `data:image/${ext};base64,` + btoa(zip.file(logoName)!.asBinary());
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Logo";
      img.style.cssText =
        "position:absolute;top:12%;left:50%;transform:translateX(-50%);width:10%;height:auto;z-index:1;";
      page.appendChild(img);
    }
  } catch {
    /* jika gagal, pratinjau tetap tampil tanpa logo */
  }
}

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
        if (!cancelled && el) await decorateCover(el, blob);
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
