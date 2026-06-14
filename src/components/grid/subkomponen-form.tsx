'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';

export function SubKomponenForm({
  open, onSubmit, onClose,
}: {
  open: boolean;
  onSubmit: (v: { kode: string; uraian: string }) => Promise<void> | void;
  onClose: () => void;
}) {
  const [kode, setKode] = React.useState('');
  const [uraian, setUraian] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => { if (open) { setKode(''); setUraian(''); setErr(null); } }, [open]);

  async function submit() {
    if (!kode.trim()) return setErr('Isi kode, atau klik "Tanpa Sub Komponen".');
    setBusy(true); setErr(null);
    try { await onSubmit({ kode: kode.trim().toUpperCase(), uraian: uraian.trim() }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Form Rekam Sub Komponen"
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Ok'}</Button>
      </>}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Sub Komponen</label>
          <div className="flex gap-2">
            <Input className="max-w-[140px]" maxLength={3} value={kode} onChange={(e) => setKode(e.target.value)} placeholder="A" />
            <Button type="button" variant="secondary" onClick={() => setKode('-')}>Tanpa Sub Komponen</Button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Uraian</label>
          <Input value={uraian} onChange={(e) => setUraian(e.target.value)} placeholder="Uraian sub komponen" />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    </Modal>
  );
}
