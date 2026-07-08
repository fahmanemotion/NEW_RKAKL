"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Printer, Download } from "lucide-react";

/** Modal pratinjau RAB: menampilkan HTML RAB dalam iframe + aksi Cetak/Simpan PDF & Unduh Excel. */
export function RabPreviewModal({
  open,
  onClose,
  html,
  title,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  html: string | null;
  title?: string;
  onDownload?: () => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  function printDoc() {
    const w = iframeRef.current?.contentWindow;
    if (w) {
      w.focus();
      w.print();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-5xl"
      title="Pratinjau RAB"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="max-w-[40%] truncate text-xs text-muted-foreground">{title ?? ""}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            {onDownload && (
              <Button variant="outline" onClick={onDownload}>
                <Download className="size-4" /> Unduh Excel
              </Button>
            )}
            <Button onClick={printDoc}>
              <Printer className="size-4" /> Cetak / Simpan PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-border bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={html ?? ""}
          title="Pratinjau RAB"
          className="h-[70vh] w-full"
        />
      </div>
    </Modal>
  );
}
