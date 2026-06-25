'use client';
import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button, Input } from '@/components/ui';
import { searchReference, type RefQuery, type RefRow } from '@/lib/penganggaran-api';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  title: string;
  query: RefQuery;
  extraHead?: string;
  okGreen?: boolean;       // tombol "Oke" hijau (gaya Pilih KRO)
  onPick: (row: RefRow) => void;
  onClose: () => void;
  // Bila diberikan, tampilkan opsi INPUT MANUAL (kode + uraian) untuk menambah
  // entri yang belum ada di referensi — mis. komponen RO yang belum terdaftar.
  onManual?: (v: { kode: string; uraian: string }) => void;
}

const PER = 50;

export function ReferencePicker({ open, title, query, extraHead, okGreen, onPick, onClose, onManual }: Props) {
  const [q, setQ] = React.useState('');
  const [term, setTerm] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<RefRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [sel, setSel] = React.useState<RefRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [mKode, setMKode] = React.useState('');
  const [mUraian, setMUraian] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setQ(''); setTerm(''); setPage(1); setSel(null);
      setManualOpen(false); setMKode(''); setMUraian('');
    }
  }, [open, query.table]);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setErr(null);
    searchReference(query, term, page, PER)
      .then((r) => {
        if (!active) return;
        // Dedup defensif: gabungkan HANYA baris yang benar-benar identik
        // (kode DAN nama sama) — sisa duplikat data master. Jangan dedup by
        // kode saja, karena komponen berbeda yang kebetulan berkode sama akan
        // ikut terbuang sehingga "tidak muncul".
        const seen = new Set<string>();
        const uniq = r.rows.filter((row) => {
          const k = `${(row.kode || "").trim()}|${(row.nama || "").trim()}`.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setRows(uniq);
        setTotal(r.total);
      })
      .catch((e) => active && setErr(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, query, term, page]);

  const pages = Math.max(1, Math.ceil(total / PER));

  // Bila referensi kosong & input manual tersedia, buka panel manual otomatis.
  React.useEffect(() => {
    if (onManual && !loading && !err && rows.length === 0) setManualOpen(true);
  }, [onManual, loading, err, rows.length]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            variant={okGreen ? 'success' : 'default'}
            disabled={!sel}
            onClick={() => sel && onPick(sel)}
          >
            {okGreen ? 'Oke' : 'Pilih'}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Pencarian kode atau deskripsi…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setTerm(q), setPage(1))}
          />
        </div>
        <Button onClick={() => { setTerm(q); setPage(1); }}>Cari</Button>
      </div>

      <div className="max-h-[46vh] overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-xs">
            <tr>
              <th className="w-56 px-3 py-2 text-left font-semibold">Kode</th>
              <th className="px-3 py-2 text-left font-semibold">Deskripsi</th>
              {extraHead && <th className="w-28 px-3 py-2 text-left font-semibold">{extraHead}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
            ) : err ? (
              <tr><td colSpan={3} className="py-6 text-center text-destructive">{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Tidak ada hasil.</td></tr>
            ) : rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSel(r)}
                onDoubleClick={() => onPick(r)}
                className={cn('cursor-pointer border-t border-border hover:bg-accent', sel?.id === r.id && 'bg-primary/15 font-medium')}
              >
                <td className="px-3 py-1.5 font-mono">{r.kode}</td>
                <td className="px-3 py-1.5">{r.nama}</td>
                {extraHead && <td className="px-3 py-1.5">{r.extra}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1 text-sm">
        <PagerBtn onClick={() => setPage(1)} disabled={page === 1}>«</PagerBtn>
        <PagerBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PagerBtn>
        <span className="px-3 text-muted-foreground">Hal {page} / {pages}</span>
        <PagerBtn onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</PagerBtn>
        <PagerBtn onClick={() => setPage(pages)} disabled={page === pages}>»</PagerBtn>
      </div>

      {onManual && (
        <div className="mt-3 rounded-md border border-dashed border-border p-3">
          {!manualOpen ? (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Input manual (untuk kode yang belum ada di referensi)
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Tambah entri yang belum terdaftar di referensi. Isi kode &amp; uraian, lalu Tambah.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="sm:w-36"
                  placeholder="Kode (mis. 002)"
                  value={mKode}
                  onChange={(e) => setMKode(e.target.value)}
                />
                <Input
                  className="flex-1"
                  placeholder="Uraian"
                  value={mUraian}
                  onChange={(e) => setMUraian(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && mKode.trim() && mUraian.trim())
                      onManual({ kode: mKode.trim(), uraian: mUraian.trim() });
                  }}
                />
                <Button
                  disabled={!mKode.trim() || !mUraian.trim()}
                  onClick={() => onManual({ kode: mKode.trim(), uraian: mUraian.trim() })}
                >
                  Tambah
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PagerBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="h-8 min-w-8 rounded-md border border-border bg-card px-2 font-semibold text-primary disabled:opacity-40"
      {...p}
    >
      {children}
    </button>
  );
}
