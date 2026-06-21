'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';

/**
 * Form Header: pengelompok di bawah Akun yang hanya berisi URAIAN.
 * Header menjumlahkan seluruh Detail di bawahnya.
 */
export function HeaderForm({
  open, onSubmit, onClose, initial,
}: {
  open: boolean;
  onSubmit: (uraian: string) => Promise<void> | void;
  onClose: () => void;
  initial?: string;
}) {
  const [uraian, setUraian] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const editing = initial !== undefined && initial !== null;

  React.useEffect(() => {
    if (open) {
      setUraian(initial ?? '');
      setErr(null);
    }
  }, [open, initial]);

  async function submit() {
    if (!uraian.trim()) return setErr('Isi uraian header.');
    setBusy(true); setErr(null);
    try { await onSubmit(uraian.trim()); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={editing ? 'Ubah Header' : 'Tambah Header'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Ok'}</Button>
      </>}
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Header mengelompokkan beberapa detail di bawah satu akun dan
          menjumlahkan nilainya. Cukup isi uraian.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Uraian Header</label>
          <Input
            autoFocus
            value={uraian}
            onChange={(e) => setUraian(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="mis. Diklat Pelaut V (DPV) Nautika"
          />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    </Modal>
  );
}
