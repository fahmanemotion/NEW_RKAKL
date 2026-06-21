'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';
import { Check } from 'lucide-react';

export interface KroOption {
  id: string;
  kode: string;
  uraian: string;
  programLabel: string; // "022.12.DL Pendidikan ..."
  kegiatanLabel: string; // "3996 Dukungan Manajemen ..."
}

/**
 * Modal "KRO yang akan ditampilkan".
 * Hanya kolom KODE (kode + uraian Program/Kegiatan/KRO) dan kolom centang.
 * Bisa mencentang lebih dari satu KRO. Kosong = tampilkan semua.
 */
export function KroFilterModal({
  open, onClose, options, value, onApply,
}: {
  open: boolean;
  onClose: () => void;
  options: KroOption[];
  value: Set<string>;
  onApply: (next: Set<string>) => void;
}) {
  const [draft, setDraft] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    if (open) { setDraft(new Set(value)); setQ(''); }
  }, [open, value]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) =>
        o.kode.toLowerCase().includes(s) ||
        o.uraian.toLowerCase().includes(s) ||
        o.programLabel.toLowerCase().includes(s) ||
        o.kegiatanLabel.toLowerCase().includes(s),
    );
  }, [options, q]);

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const allVisibleChecked =
    filtered.length > 0 && filtered.every((o) => draft.has(o.id));
  function toggleAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) filtered.forEach((o) => next.delete(o.id));
      else filtered.forEach((o) => next.add(o.id));
      return next;
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pilih KRO yang akan ditampilkan"
      className="max-w-3xl"
      footer={<>
        <span className="mr-auto text-xs text-muted-foreground">
          {draft.size === 0 ? 'Belum ada yang dicentang → semua KRO ditampilkan' : `${draft.size} KRO dipilih`}
        </span>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => { onApply(new Set(draft)); onClose(); }}>Ok</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pencarian kode / uraian…"
            className="flex-1"
          />
          <Button variant="secondary" onClick={toggleAllVisible}>
            {allVisibleChecked ? 'Kosongkan' : 'Pilih semua'}
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[1fr_64px] items-center border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <span>Kode</span>
            <span className="text-center">Pilih</span>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada KRO yang cocok.
              </p>
            )}
            {filtered.map((o) => {
              const checked = draft.has(o.id);
              return (
                <label
                  key={o.id}
                  className="grid cursor-pointer grid-cols-[1fr_64px] items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent/50"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {o.kode}{o.uraian ? ` — ${o.uraian}` : ''}
                    </span>
                    {(o.programLabel || o.kegiatanLabel) && (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {[o.programLabel, o.kegiatanLabel].filter(Boolean).join('  ›  ')}
                      </span>
                    )}
                  </span>
                  <span className="flex justify-center">
                    <span
                      className={
                        'flex size-5 items-center justify-center rounded border ' +
                        (checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background')
                      }
                    >
                      {checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(o.id)}
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
