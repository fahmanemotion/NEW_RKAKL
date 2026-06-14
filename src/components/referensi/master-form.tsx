'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input, Select } from '@/components/ui';
import { listParents } from '@/lib/referensi-api';
import type { MasterDef } from '@/lib/referensi';

export interface MasterFormValues {
  id?: string;
  [k: string]: unknown;
}

export function MasterForm({
  open, def, initial, onSubmit, onClose,
}: {
  open: boolean;
  def: MasterDef;
  initial?: MasterFormValues;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  onClose: () => void;
}) {
  const [v, setV] = React.useState<Record<string, unknown>>({});
  const [parents, setParents] = React.useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setV(initial ? { ...initial } : {});
    setErr(null);
    if (def.parent) listParents(def).then(setParents).catch((e) => setErr(e.message));
  }, [open, def, initial]);

  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));

  async function submit() {
    const kode = String(v[def.kodeCol] ?? '').trim();
    if (!kode) return setErr('Kode wajib diisi.');
    if (def.parent && !v[def.parent.fkCol]) return setErr(`Pilih ${def.parent.label} (induk) dulu.`);
    for (const f of def.extraFields ?? []) {
      if (f.required && !v[f.key]) return setErr(`${f.label} wajib diisi.`);
    }
    if (!v[def.namaCol]) set(def.namaCol, kode);
    setBusy(true); setErr(null);
    try { await onSubmit(v); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const isEdit = !!initial?.id;

  return (
    <Modal
      open={open} onClose={onClose}
      title={`${isEdit ? 'Edit' : 'Tambah'} ${def.label}`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
      </>}
    >
      <div className="space-y-3">
        {def.parent && (
          <Field label={`${def.parent.label} (induk)`}>
            <Select value={String(v[def.parent.fkCol] ?? '')} onChange={(e) => set(def.parent!.fkCol, e.target.value)}>
              <option value="">— pilih {def.parent.label} —</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Kode">
            <Input value={String(v[def.kodeCol] ?? '')} onChange={(e) => set(def.kodeCol, e.target.value)} placeholder="mis. 051" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Nama / Uraian">
              <Input value={String(v[def.namaCol] ?? '')} onChange={(e) => set(def.namaCol, e.target.value)} placeholder="Uraian" />
            </Field>
          </div>
        </div>
        {(def.extraFields ?? []).map((f) => (
          <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
            {f.type === 'select' ? (
              <Select value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">— pilih —</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : (
              <Input value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </Field>
        ))}
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
