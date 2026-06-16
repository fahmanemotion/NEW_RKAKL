"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { deleteUsulanAction } from "@/app/(dashboard)/penganggaran/actions";

/**
 * Tombol hapus untuk satu baris usulan di halaman daftar.
 * - Dipasang sebagai saudara (sibling) dari <Link> baris, sehingga klik hapus
 *   tidak ikut membuka halaman input.
 * - Memunculkan dialog konfirmasi sebelum benar-benar menghapus.
 * - Bila `disabled`, tombol diredupkan dengan tooltip alasan.
 */
export function DeleteUsulanButton({
  id,
  title,
  disabled,
  disabledReason,
}: {
  id: string;
  title: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onConfirm() {
    setBusy(true);
    setErr(null);
    try {
      await deleteUsulanAction(id);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) {
            setErr(null);
            setOpen(true);
          }
        }}
        disabled={disabled}
        title={disabled ? (disabledReason ?? "Tidak dapat dihapus") : "Hapus usulan"}
        aria-label="Hapus usulan"
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Hapus Usulan"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Hapus
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm">
              Yakin menghapus <strong>{title}</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              Seluruh rincian (struktur &amp; detail belanja) di dalamnya akan
              ikut terhapus permanen dan tidak dapat dikembalikan.
            </p>
          </div>
        </div>
        {err && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
      </Modal>
    </>
  );
}
