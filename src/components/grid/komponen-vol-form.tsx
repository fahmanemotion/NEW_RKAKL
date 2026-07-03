'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';
import { fmtN } from '@/lib/constants';

/**
 * Form isi VOLUME & SATUAN untuk node terukur (KOMPONEN/RO/KRO).
 *
 * - KOMPONEN (satuanOnly=false): volume & satuan diinput manual.
 * - RO/KRO   (satuanOnly=true) : volume DIHITUNG OTOMATIS berjenjang
 *     (Volume RO = Σ volume komponen; Volume KRO = Σ volume RO), jadi di sini
 *     hanya SATUAN yang diedit; volume otomatis ditampilkan read-only.
 *
 * Tidak memengaruhi perhitungan pagu (jumlah tetap = Σ rincian di bawahnya).
 */
export function KomponenVolForm({
  open,
  initial,
  satuanOnly = false,
  title,
  volumeLabel = 'Volume',
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: { kode: string; uraian: string; volume: number; satuan: string };
  satuanOnly?: boolean;
  title?: string;
  volumeLabel?: string;
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
    // Untuk RO/KRO volume otomatis (tidak diubah); untuk komponen ambil dari input.
    const vol = satuanOnly ? (initial?.volume ?? 0) : Number(volume);
    if (!satuanOnly && (!Number.isFinite(vol) || vol < 0))
      return setErr('Volume harus berupa angka ≥ 0.');
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
      title={title ?? 'Volume & Satuan Komponen'}
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{volumeLabel}</label>
            {satuanOnly ? (
              <div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm">
                {initial && initial.volume ? fmtN(initial.volume) : '0'}
                <span className="ml-2 text-[11px] text-muted-foreground">(otomatis)</span>
              </div>
            ) : (
              <Input
                type="number"
                min={0}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="mis. 980"
              />
            )}
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Satuan</label>
            <Input value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="mis. Orang" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {satuanOnly
            ? 'Volume dihitung otomatis dari total volume di bawahnya. Isi satuannya di sini.'
            : 'Volume komponen ini dijumlahkan otomatis menjadi Volume RO di atasnya. Nilai ini tidak mengubah perhitungan pagu.'}
        </p>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    </Modal>
  );
}
