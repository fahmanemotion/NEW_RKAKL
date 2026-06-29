"use client";
import * as React from "react";
import { Plus, Pencil, Trash2, Loader2, Stamp, Inbox } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase";

interface Penandatangan {
  id: string;
  nama: string;
  jabatan: string | null;
  pangkat_golongan: string | null;
  nip: string | null;
}

const TABLE = "master_penandatangan";

export function PenandatanganManager() {
  const [rows, setRows] = React.useState<Penandatangan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ initial?: Penandatangan } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from(TABLE)
        .select("id, nama, jabatan, pangkat_golongan, nip")
        .order("nama", { ascending: true });
      if (error) throw error;
      setRows((data ?? []) as Penandatangan[]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onDelete(r: Penandatangan) {
    if (!confirm(`Hapus penandatangan "${r.nama}"?`)) return;
    try {
      const sb = createClient();
      const { error } = await sb.from(TABLE).delete().eq("id", r.id);
      if (error) throw error;
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Stamp className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Daftar Penandatangan</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {rows.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pejabat yang dipilih saat membuat laporan RAB (sisi kiri &amp; kanan).
              </p>
            </div>
          </div>
          <Button onClick={() => setForm({})}>
            <Plus className="size-4" /> Tambah Penandatangan
          </Button>
        </div>

        <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted">
                <th className="px-3 py-2.5 font-semibold">Nama</th>
                <th className="px-3 py-2.5 font-semibold">Jabatan</th>
                <th className="px-3 py-2.5 font-semibold">Pangkat/Golongan</th>
                <th className="px-3 py-2.5 font-semibold">NIP</th>
                <th className="w-24 px-3 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
              ) : err ? (
                <tr><td colSpan={5} className="py-6 text-center text-destructive">{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Inbox className="mx-auto mb-2 size-6" /> Belum ada penandatangan. Klik <strong>Tambah Penandatangan</strong>.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-border transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2 font-medium">{r.nama}</td>
                  <td className="px-3 py-2">{r.jabatan ?? ""}</td>
                  <td className="px-3 py-2">{r.pangkat_golongan ?? ""}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.nip ?? ""}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit" onClick={() => setForm({ initial: r })}><Pencil className="size-4" /></button>
                      <button className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Hapus" onClick={() => onDelete(r)}><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {form && (
        <PenandatanganForm
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}
    </div>
  );
}

function PenandatanganForm({
  initial, onClose, onSaved,
}: {
  initial?: Penandatangan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = React.useState({
    nama: initial?.nama ?? "",
    jabatan: initial?.jabatan ?? "",
    pangkat_golongan: initial?.pangkat_golongan ?? "",
    nip: initial?.nip ?? "",
  });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function submit() {
    if (!v.nama.trim()) return setErr("Nama wajib diisi.");
    setBusy(true);
    setErr(null);
    try {
      const sb = createClient();
      const payload = {
        nama: v.nama.trim(),
        jabatan: v.jabatan.trim() || null,
        pangkat_golongan: v.pangkat_golongan.trim() || null,
        nip: v.nip.trim() || null,
      };
      const { error } = initial?.id
        ? await sb.from(TABLE).update(payload).eq("id", initial.id)
        : await sb.from(TABLE).insert(payload);
      if (error) throw error;
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${initial?.id ? "Edit" : "Tambah"} Penandatangan`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</Button>
      </>}
    >
      <div className="space-y-3">
        <Field label="Nama *">
          <Input value={v.nama} onChange={(e) => set("nama", e.target.value)} placeholder="mis. Capt. RUDY SUSANTO, M.Pd." />
        </Field>
        <Field label="Jabatan">
          <Input value={v.jabatan} onChange={(e) => set("jabatan", e.target.value)} placeholder="mis. KUASA PENGGUNA ANGGARAN POLITEKNIK ILMU PELAYARAN MAKASSAR" />
        </Field>
        <Field label="Pangkat/Golongan">
          <Input value={v.pangkat_golongan} onChange={(e) => set("pangkat_golongan", e.target.value)} placeholder="mis. Pembina (IV/a)" />
        </Field>
        <Field label="NIP">
          <Input value={v.nip} onChange={(e) => set("nip", e.target.value)} placeholder="mis. 19731210 200502 1 001" />
        </Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
