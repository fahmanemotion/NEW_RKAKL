'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input, Select } from '@/components/ui';
import { fmtN, JENIS_BELANJA, type JenisBelanja } from '@/lib/constants';
import { computeVolume, computeJumlah, effectiveVolume, normalizeSegments, type VolSegment } from '@/lib/detail-volume';

export interface DetailValues {
  id?: string;
  uraian: string;
  volume: number;
  satuan: string;
  harga: number;
  jenis_belanja: JenisBelanja;
  segments: { qty: number; sat: string }[] | null;
}

const EMPTY_SEG: VolSegment[] = [
  { qty: '', sat: '' }, { qty: '', sat: '' }, { qty: '', sat: '' }, { qty: '', sat: '' }, { qty: '', sat: '' },
];

export function DetailForm({
  open, initial, akunInfo, onSubmit, onClose,
}: {
  open: boolean;
  initial?: Partial<DetailValues>;
  akunInfo?: { kode: string; uraian: string; sumberDana: string; kategori?: string };
  onSubmit: (v: DetailValues) => Promise<void> | void;
  onClose: () => void;
}) {
  const [seg, setSeg] = React.useState<VolSegment[]>(EMPTY_SEG);
  const [showRincian, setShowRincian] = React.useState(false);   // default: rincian tersembunyi
  const [manualVolume, setManualVolume] = React.useState<number | string>(1); // Volkeg manual
  const [uraian, setUraian] = React.useState('');
  const [harga, setHarga] = React.useState(0);
  const [jenis, setJenis] = React.useState<JenisBelanja>('OPS');
  const [satkeg, setSatkeg] = React.useState('');       // satuan manual (Satkeg)
  const [satkegTouched, setSatkegTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    if (initial?.id) {
      // Edit: muat segmen tersimpan bila ada → mode rincian; selain itu manual.
      const stored = initial.segments ?? null;
      if (stored && stored.length > 0) {
        const filled = EMPTY_SEG.map((s, i) =>
          stored[i] ? { qty: stored[i].qty, sat: stored[i].sat } : { ...s },
        );
        setSeg(filled);
        setShowRincian(true);
      } else {
        setSeg(EMPTY_SEG.map((s) => ({ ...s })));
        setShowRincian(false);
      }
      setManualVolume(initial.volume ?? 1);
      setUraian(initial.uraian ?? '');
      setHarga(initial.harga ?? 0);
      setJenis((initial.jenis_belanja as JenisBelanja) ?? 'OPS');
      setSatkeg(initial.satuan ?? '');
      setSatkegTouched(true);   // jangan timpa satuan lama dengan saran otomatis
    } else {
      setSeg(EMPTY_SEG.map((s) => ({ ...s })));
      setShowRincian(false); setManualVolume(1);
      setUraian(''); setHarga(0); setJenis('OPS');
      setSatkeg(''); setSatkegTouched(false);
    }
  }, [open, initial]);

  const rincian = computeVolume(seg);
  const volume = effectiveVolume(showRincian, manualVolume, seg);
  const jumlah = computeJumlah(volume, harga);

  // Saran satuan otomatis dari segmen — hanya di mode rincian & belum diketik manual.
  React.useEffect(() => {
    if (open && showRincian && !satkegTouched) setSatkeg(rincian.satuan);
  }, [rincian.satuan, satkegTouched, open, showRincian]);

  function setSegAt(i: number, patch: Partial<VolSegment>) {
    setSeg((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  // Enter di Uraian → buka/tutup rincian. Saat membuka, isi segmen pertama dari
  // Volkeg manual agar nilai berlanjut; saat menutup, Volkeg = hasil kali rincian.
  function toggleRincian() {
    if (!showRincian) {
      const anyFilled = seg.some((x) => Number(x.qty) > 0);
      if (!anyFilled && Number(manualVolume) > 0) {
        setSeg((s) => { const c = s.map((o) => ({ ...o })); c[0] = { qty: manualVolume, sat: satkeg }; return c; });
      }
      setShowRincian(true);
    } else {
      setManualVolume(computeVolume(seg).volume || 0);
      setShowRincian(false);
    }
  }

  async function submit() {
    if (!uraian.trim()) return setErr('Uraian wajib diisi.');
    if (volume <= 0) return setErr('Volume (Volkeg) harus lebih dari 0.');
    if (harga <= 0) return setErr('Harga satuan harus lebih dari 0.');
    setBusy(true); setErr(null);
    try {
      const segments = showRincian ? normalizeSegments(seg) : null;
      await onSubmit({ id: initial?.id, uraian: uraian.trim(), volume, satuan: satkeg.trim(), harga, jenis_belanja: jenis, segments });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Form Rekam Akun Detail"
      className="max-w-4xl"
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Ok'}</Button>
      </>}
    >
      <div className="space-y-4">
        {/* Info akun (sumber dana & kategori otomatis ikut akun) */}
        {akunInfo && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
            <span><span className="text-muted-foreground">Akun:</span> <span className="font-mono">{akunInfo.kode}</span> {akunInfo.uraian}</span>
            <span><span className="text-muted-foreground">Sumber Dana:</span> <strong>{akunInfo.sumberDana}</strong></span>
            {akunInfo.kategori && <span><span className="text-muted-foreground">Kategori:</span> <strong>{akunInfo.kategori}</strong></span>}
          </div>
        )}

        {/* Rincian volume (kiri, span 3 kolom) + Jenis Belanja (kolom ke-4, sejajar Jumlah) */}
        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
          {showRincian && (
            <div className="col-span-2 sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Rincian Volume (Volkeg terkunci = hasil kali)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="px-0.5 text-muted-foreground">×</span>}
                    <Input className="w-16 text-right" type="number" min={0} placeholder="0"
                      value={seg[i].qty === 0 ? '' : String(seg[i].qty)}
                      onChange={(e) => setSegAt(i, { qty: e.target.value })} />
                    <Input className="w-24" placeholder="satuan"
                      value={seg[i].sat} onChange={(e) => setSegAt(i, { sat: e.target.value })} />
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {[3, 4].map((i) => (
                  <React.Fragment key={i}>
                    <span className="px-0.5 text-muted-foreground">×</span>
                    <Input className="w-16 text-right" type="number" min={0} placeholder="0"
                      value={seg[i].qty === 0 ? '' : String(seg[i].qty)}
                      onChange={(e) => setSegAt(i, { qty: e.target.value })} />
                    <Input className="w-24" placeholder="satuan"
                      value={seg[i].sat} onChange={(e) => setSegAt(i, { sat: e.target.value })} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          <div className="sm:col-start-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Jenis Belanja</label>
            <Select value={jenis} onChange={(e) => setJenis(e.target.value as JenisBelanja)} className="w-full">
              {JENIS_BELANJA.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
            </Select>
          </div>
        </div>

        {/* Uraian — tekan Enter untuk membuka/menutup rincian volume */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Uraian</label>
          <Input value={uraian} onChange={(e) => setUraian(e.target.value)} placeholder="Uraian detail belanja"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toggleRincian(); } }} />
          <p className="mt-1 text-xs text-muted-foreground">
            {showRincian
              ? 'Tekan Enter lagi di Uraian untuk kembali ke input Volkeg manual.'
              : 'Tekan Enter di Uraian untuk mengisi rincian volume (Volkeg dihitung otomatis).'}
          </p>
        </div>

        {/* Volkeg / Satkeg / Harga / Jumlah */}
        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Volkeg</label>
            {showRincian ? (
              <Input value={fmtN(volume)} readOnly className="bg-muted text-right" title="Terkunci — dihitung dari rincian" />
            ) : (
              <Input type="number" min={0} className="text-right" placeholder="0"
                value={manualVolume === 0 ? '' : String(manualVolume)} onChange={(e) => setManualVolume(e.target.value)} />
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Satkeg</label>
            <Input value={satkeg} onChange={(e) => { setSatkeg(e.target.value); setSatkegTouched(true); }} placeholder="isi satuan" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Harga Satuan</label>
            <Input type="number" min={0} value={harga || ''} onChange={(e) => setHarga(+e.target.value)} className="text-right" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Jumlah</label>
            <Input value={fmtN(jumlah)} readOnly className="bg-muted text-right font-semibold" />
          </div>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </Modal>
  );
}
