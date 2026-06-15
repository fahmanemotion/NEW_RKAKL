"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Lock } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Modal } from "@/components/ui/modal";
import { Button, Select, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { createUsulanAction } from "@/app/(dashboard)/penganggaran/actions";
import {
  tahapWorkflowState,
  TAHAP_LABEL,
  type TahapPagu,
} from "@/lib/tahap-pagu";

interface UsulanRow {
  tahun_anggaran: number;
  tahap_pagu: string | null;
  status: string;
}
const sb = () => createClient() as unknown as SupabaseClient;

export function NewUsulanButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tahun, setTahun] = React.useState(new Date().getFullYear() + 1);
  const [existing, setExisting] = React.useState<UsulanRow[]>([]);
  const [tahap, setTahap] = React.useState<TahapPagu | "">("");
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Ambil usulan satker (RLS membatasi ke satker sendiri) saat modal dibuka.
  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setLoading(true);
    (async () => {
      const { data, error } = await sb()
        .from("usulan_anggaran")
        .select("tahun_anggaran, tahap_pagu, status");
      if (error) setErr(error.message);
      setExisting((data ?? []) as unknown as UsulanRow[]);
      setLoading(false);
    })();
  }, [open]);

  // Keadaan alur untuk tahun terpilih.
  const state = React.useMemo(
    () =>
      tahapWorkflowState(existing.filter((u) => u.tahun_anggaran === tahun)),
    [existing, tahun],
  );
  // Auto-pilih tahap berikutnya yang sah.
  React.useEffect(() => {
    setTahap(state.nextTahap ?? "");
  }, [state.nextTahap]);

  async function submit() {
    if (!state.canCreate || !tahap) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await createUsulanAction({ tahun, tahapPagu: tahap });
      router.push(`/penganggaran/${id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const reasonMsg =
    state.reason === "in_progress"
      ? "Tahap yang sedang dikerjakan belum Final. Finalkan dulu untuk membuka tahap berikutnya."
      : state.reason === "all_done"
        ? "Semua tahap pagu untuk tahun ini sudah selesai."
        : null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Buat Usulan
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Usulan Anggaran"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={busy || loading || !state.canCreate || !tahap}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Buat & Buka
            </Button>
          </>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Tahun Anggaran">
              <Input
                type="number"
                value={tahun}
                onChange={(e) => setTahun(+e.target.value)}
                className="max-w-[140px]"
              />
            </Field>
            <Field label="Tahap Pagu">
              <Select
                value={tahap}
                onChange={(e) => setTahap(e.target.value as TahapPagu)}
                disabled={!state.canCreate}
              >
                {state.options.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                    {o.disabled ? " (terkunci)" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            {reasonMsg && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <Lock className="mt-0.5 size-3.5 shrink-0" /> {reasonMsg}
              </p>
            )}
            {state.canCreate && state.nextTahap && (
              <p className="text-xs text-muted-foreground">
                Hanya tahap <strong>{TAHAP_LABEL[state.nextTahap]}</strong> yang
                dapat dibuat saat ini. Tahap berikutnya terbuka setelah tahap
                ini difinalkan.
              </p>
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
