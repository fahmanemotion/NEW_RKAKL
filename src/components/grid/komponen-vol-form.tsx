'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';

/**
 * Form isi VOLUME & SATUAN pada node KOMPONEN. Nilai ini dipakai untuk TOR:
 * Volume RO = Σ volume komponen di bawah RO tersebut. Tidak memengaruhi
 * perhitungan pagu (jumlah komponen tetap = Σ rincian di bawahnya).
 */
export function KomponenVolForm({
  open,
  initial,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: { kode: string; uraian: string; volume: number; satuan: string };
  onSubmit: (v: { volume: number; satuan: string }) => Promise<void> | void;
  onClose: () => void;
}) {
  const [volume, setVolume] = React.useState('');
  const [satuan, setSatuan] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setVolume(initial && initial.volume ? String(initial.volume) : '');
      setSatuan(initial?.satuan ?? '');
      setErr(null);
    }
  }, [open, initial]);

  async function submit() {
    const vol = Number(volume);
    if (!Number.isFinite(vol) || vol < 0) return setErr('Volume harus berupa angka ≥ 0.');
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ volume: vol, satuan: satuan.trim() });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Volume & Satuan Komponen"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {initial && (
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-mono">{initial.kode}</span> — {initial.uraian}
          </p>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Volume</label>
            <Input
              type="number"
              min={0}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="mis. 980"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Satuan</label>
            <Input value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="mis. Orang" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Volume ini dipakai untuk TOR: <strong>Volume RO</strong> dihitung otomatis dari jumlah volume seluruh
          komponen di bawah RO yang sama. Nilai ini tidak mengubah perhitungan pagu.
        </p>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    </Modal>
  );
}
