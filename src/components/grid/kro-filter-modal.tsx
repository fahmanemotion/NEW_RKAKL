'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';
import { Check, Lock } from 'lucide-react';
import { usePresenceUsers } from '@/components/shell/presence';

export interface KroOption {
  id: string;
  kode: string;
  uraian: string;
  programLabel: string; // "022.12.DL Pendidikan ..."
  kegiatanLabel: string; // "3996 Dukungan Manajemen ..."
}

/**
 * Modal "KRO yang akan ditampilkan".
 * Bisa mencentang lebih dari satu KRO. Kosong = tampilkan semua.
 *
 * KRO yang sedang dipilih pengguna LAIN (via presence real-time) dikunci:
 * checkbox-nya nonaktif dan diberi penanda nama pemiliknya, agar tidak terjadi
 * dobel input pada KRO yang sama.
 */
export function KroFilterModal({
  open, onClose, options, value, claimedBy, busy, onApply,
}: {
  open: boolean;
  onClose: () => void;
  options: KroOption[];
  value: Set<string>;
  /** KRO yang dikunci pengguna lain menurut DB (otoritatif): id → nama pemilik. */
  claimedBy?: Map<string, string>;
  /** true selama proses klaim/lepas ke database. */
  busy?: boolean;
  onApply: (next: Set<string>) => void;
}) {
  const [draft, setDraft] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState('');

  // Sumber kunci digabung: DB (claimedBy, otoritatif) + presence (live).
  const { users } = usePresenceUsers();
  const lockedBy = React.useMemo(() => {
    const m = new Map<string, string>(claimedBy ?? []);
    for (const u of users) {
      if (u.self) continue;
      for (const k of u.kros) if (k.id && !m.has(k.id)) m.set(k.id, u.name);
    }
    return m;
  }, [users, claimedBy]);

  React.useEffect(() => {
    if (open) { setDraft(new Set(value)); setQ(''); }
  }, [open, value]);

  // Terkunci untuk SAYA hanya bila diambil orang lain DAN bukan pilihan saya.
  const isLocked = React.useCallback(
    (id: string) => lockedBy.has(id) && !draft.has(id),
    [lockedBy, draft],
  );

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
    if (isLocked(id)) return; // tidak bisa memilih KRO milik orang lain
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // "Pilih semua / Kosongkan" hanya berlaku untuk KRO yang dapat dipilih.
  const selectable = React.useMemo(
    () => filtered.filter((o) => !isLocked(o.id)),
    [filtered, isLocked],
  );
  const allVisibleChecked =
    selectable.length > 0 && selectable.every((o) => draft.has(o.id));
  function toggleAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) selectable.forEach((o) => next.delete(o.id));
      else selectable.forEach((o) => next.add(o.id));
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
        <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
        <Button onClick={() => { onApply(new Set(draft)); onClose(); }} disabled={busy}>
          {busy ? 'Memproses…' : 'Ok'}
        </Button>
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
              const owner = lockedBy.get(o.id);
              const locked = !!owner && !checked;
              return (
                <label
                  key={o.id}
                  className={
                    'grid grid-cols-[1fr_64px] items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 ' +
                    (locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent/50')
                  }
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {o.kode}{o.uraian ? ` — ${o.uraian}` : ''}
                    </span>
                    {locked ? (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <Lock className="size-3" /> Sedang dipilih oleh {owner}
                      </span>
                    ) : (
                      (o.programLabel || o.kegiatanLabel) && (
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {[o.programLabel, o.kegiatanLabel].filter(Boolean).join('  ›  ')}
                        </span>
                      )
                    )}
                  </span>
                  <span className="flex justify-center">
                    <span
                      className={
                        'flex size-5 items-center justify-center rounded border ' +
                        (locked
                          ? 'border-border bg-muted text-muted-foreground'
                          : checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background')
                      }
                    >
                      {locked ? <Lock className="size-3" /> : checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={locked}
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
