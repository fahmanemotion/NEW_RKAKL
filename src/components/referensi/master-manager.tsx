'use client';
import * as React from 'react';
import { Plus, Pencil, Trash2, Upload, Search, Loader2, Download } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { MASTERS, type MasterKey } from '@/lib/referensi';
import { downloadMasterTemplate } from '@/lib/template-excel';
import { listMaster, createMaster, updateMaster, deleteMaster, type RefRecord } from '@/lib/referensi-api';
import { MasterForm, type MasterFormValues } from './master-form';
import { ImportExcel } from './import-excel';

const PER = 15;

export function MasterManager({ masterKey }: { masterKey: MasterKey }) {
  const def = MASTERS[masterKey];
  const [q, setQ] = React.useState('');
  const [term, setTerm] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<RefRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ initial?: MasterFormValues } | null>(null);
  const [importing, setImporting] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true); setErr(null);
    listMaster(def, term, page, PER)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [def, term, page]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { setPage(1); setTerm(''); setQ(''); }, [masterKey]);

  const pages = Math.max(1, Math.ceil(total / PER));

  async function onSubmit(values: Record<string, unknown>) {
    const { id, ...rest } = values as { id?: string } & Record<string, unknown>;
    if (id) await updateMaster(def, id, rest);
    else await createMaster(def, rest);
    setForm(null);
    load();
  }

  async function onDelete(r: RefRecord) {
    if (!confirm(`Hapus ${def.label} "${r[def.kodeCol]}"? Data turunannya ikut terhapus.`)) return;
    try { await deleteMaster(def, r.id); load(); }
    catch (e) { alert('Gagal menghapus: ' + (e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder={`Cari ${def.label}…`} value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setTerm(q), setPage(1))} />
        </div>
        <Button variant="outline" onClick={() => { setTerm(q); setPage(1); }}>Cari</Button>
        <Button variant="outline" onClick={() => downloadMasterTemplate(def)} title={`Unduh template Excel untuk import ${def.label}`}><Download className="size-4" /> Unduh Template</Button>
        <Button variant="secondary" onClick={() => setImporting(true)}><Upload className="size-4" /> Import Excel</Button>
        <Button onClick={() => setForm({})}><Plus className="size-4" /> Tambah {def.label}</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: '58vh' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-xs">
              <tr>
                <th className="w-40 px-3 py-2 text-left font-semibold">Kode</th>
                <th className="px-3 py-2 text-left font-semibold">Nama / Uraian</th>
                {def.extraFields?.map((f) => <th key={f.key} className="w-40 px-3 py-2 text-left font-semibold">{f.label}</th>)}
                <th className="w-24 px-3 py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
              ) : err ? (
                <tr><td colSpan={5} className="py-6 text-center text-destructive">{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada data. Klik <strong>Tambah</strong> atau <strong>Import Excel</strong>.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-3 py-1.5 font-mono">{String(r[def.kodeCol] ?? '')}</td>
                  <td className="px-3 py-1.5">{String(r[def.namaCol] ?? '')}</td>
                  {def.extraFields?.map((f) => <td key={f.key} className="px-3 py-1.5">{String(r[f.key] ?? '')}</td>)}
                  <td className="px-3 py-1.5">
                    <div className="flex justify-end gap-1">
                      <button className="rounded p-1.5 hover:bg-accent" title="Edit" onClick={() => setForm({ initial: r as MasterFormValues })}><Pencil className="size-4" /></button>
                      <button className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Hapus" onClick={() => onDelete(r)}><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">{total} data</span>
          <div className="flex items-center gap-1">
            <Pg onClick={() => setPage(1)} disabled={page === 1}>«</Pg>
            <Pg onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</Pg>
            <span className="px-2 text-muted-foreground">{page}/{pages}</span>
            <Pg onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</Pg>
            <Pg onClick={() => setPage(pages)} disabled={page === pages}>»</Pg>
          </div>
        </div>
      </Card>

      <MasterForm open={!!form} def={def} initial={form?.initial} onSubmit={onSubmit} onClose={() => setForm(null)} />
      <ImportExcel open={importing} def={def} onClose={() => setImporting(false)} onDone={load} />
    </div>
  );
}

function Pg({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('h-8 min-w-8 rounded-md border border-border bg-card px-2 font-semibold text-primary disabled:opacity-40')} {...p}>{children}</button>;
}
