"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Lock } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Modal } from "@/components/ui/modal";
import { Button, Select, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import {
  createUsulanAction,
  copyAnggaranAction,
} from "@/app/(dashboard)/penganggaran/actions";
import {
  tahapWorkflowState,
  TAHAP_LABEL,
  TAHAP_ORDER,
  type TahapPagu,
} from "@/lib/tahap-pagu";
import { fmtRp } from "@/lib/constants";

interface UsulanRow {
  id: string;
  tahun_anggaran: number;
  tahap_pagu: string | null;
  status: string;
  total_anggaran: number | null;
}
const sb = () => createClient() as unknown as SupabaseClient;

export function NewUsulanButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tahun, setTahun] = React.useState(new Date().getFullYear() + 1);
  const [existing, setExisting] = React.useState<UsulanRow[]>([]);
  const [tahap, setTahap] = React.useState<TahapPagu | "">("");
  const [copyFromId, setCopyFromId] = React.useState<string>(""); // "" = kosong
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [copying, setCopying] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Ambil usulan satker (RLS membatasi ke satker sendiri) saat modal dibuka.
  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setLoading(true);
    (async () => {
      const { data, error } = await sb()
        .from("usulan_anggaran")
        .select("id, tahun_anggaran, tahap_pagu, status, total_anggaran");
      if (error) setErr(error.message);
      setExisting((data ?? []) as unknown as UsulanRow[]);
      setLoading(false);
    })();
  }, [open]);

  // Sumber salinan: usulan TAHUN SEBELUMNYA (tahun − 1) milik satker yang SUDAH
  // berisi pagu (total > 0). Hingga 4 tahap. Kosong bila tahun sebelumnya belum ada.
  const copySources = React.useMemo(
    () =>
      existing
        .filter(
          (u) =>
            u.tahun_anggaran === tahun - 1 && (Number(u.total_anggaran) || 0) > 0,
        )
        .sort(
          (a, b) =>
            TAHAP_ORDER.indexOf(a.tahap_pagu as TahapPagu) -
            TAHAP_ORDER.indexOf(b.tahap_pagu as TahapPagu),
        ),
    [existing, tahun],
  );
  // Reset pilihan salin bila tahun berganti (sumber ikut berganti).
  React.useEffect(() => {
    setCopyFromId("");
  }, [tahun]);

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
      // Opsional: salin SELURUH rincian dari usulan tahun sebelumnya terpilih.
      if (copyFromId) {
        setCopying(true);
        const res = await copyAnggaranAction(id, copyFromId);
        if (!res.ok) {
          alert(
            "Usulan berhasil dibuat, tetapi penyalinan gagal: " +
              res.error +
              "\n\nAnda dapat menyalin lagi dari dalam usulan (kartu “Salin Anggaran”).",
          );
        }
      }
      router.push(`/penganggaran/${id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      setCopying(false);
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
              {busy && <Loader2 className="size-4 animate-spin" />}{" "}
              {copying
                ? "Menyalin…"
                : copyFromId
                  ? "Buat, Salin & Buka"
                  : "Buat & Buka"}
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

            <Field label={`Salin dari PAGU TA ${tahun - 1} (opsional)`}>
              <Select
                value={copyFromId}
                onChange={(e) => setCopyFromId(e.target.value)}
                disabled={!state.canCreate || copySources.length === 0}
              >
                <option value="">— Kosong (input dari awal) —</option>
                {copySources.map((s) => (
                  <option key={s.id} value={s.id}>
                    TA {s.tahun_anggaran} ·{" "}
                    {TAHAP_LABEL[s.tahap_pagu as TahapPagu] ?? s.tahap_pagu} ·
                    Pagu {fmtRp(s.total_anggaran)}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {copySources.length === 0
                  ? `Tidak ada usulan TA ${tahun - 1} berisi pagu untuk disalin — usulan akan dibuat kosong.`
                  : `Salin seluruh rincian dari salah satu PAGU TA ${tahun - 1} agar tinggal disesuaikan/ditambah.`}
              </p>
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
