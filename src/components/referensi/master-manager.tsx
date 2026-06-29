'use client';
import * as React from 'react';
import { Plus, Pencil, Trash2, Upload, Search, Loader2, Download, Table2, Inbox } from 'lucide-react';
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
  const colCount = 3 + (def.extraFields?.length ?? 0);

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
      <Card className="overflow-hidden">
        {/* Header + aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Table2 className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Daftar {def.label}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {total}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tambah, ubah, hapus, atau impor master {def.label}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => downloadMasterTemplate(def)} title={`Unduh template Excel untuk import ${def.label}`}>
              <Download className="size-4" /> Template
            </Button>
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload className="size-4" /> Import Excel
            </Button>
            <Button onClick={() => setForm({})}>
              <Plus className="size-4" /> Tambah {def.label}
            </Button>
          </div>
        </div>

        {/* Pencarian */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 p-3">
          <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={q}
              placeholder={`Cari ${def.label}…`}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setTerm(q), setPage(1))}
              className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button variant="outline" onClick={() => { setTerm(q); setPage(1); }}>Cari</Button>
        </div>

        {/* Tabel */}
        <div className="max-h-[58vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted">
                <th className="w-40 px-3 py-2.5 font-semibold">Kode</th>
                <th className="px-3 py-2.5 font-semibold">Nama / Uraian</th>
                {def.extraFields?.map((f) => <th key={f.key} className="w-40 px-3 py-2.5 font-semibold">{f.label}</th>)}
                <th className="w-24 px-3 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
              ) : err ? (
                <tr><td colSpan={colCount} className="py-6 text-center text-destructive">{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={colCount} className="py-10 text-center text-muted-foreground"><Inbox className="mx-auto mb-2 size-6" /> Belum ada data. Klik <strong>Tambah</strong> atau <strong>Import Excel</strong>.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-border transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono text-xs">{String(r[def.kodeCol] ?? '')}</td>
                  <td className="px-3 py-2">{String(r[def.namaCol] ?? '')}</td>
                  {def.extraFields?.map((f) => <td key={f.key} className="px-3 py-2">{String(r[f.key] ?? '')}</td>)}
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit" onClick={() => setForm({ initial: r as MasterFormValues })}><Pencil className="size-4" /></button>
                      <button className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Hapus" onClick={() => onDelete(r)}><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">{total} data</span>
          <div className="flex items-center gap-1">
            <Pg onClick={() => setPage(1)} disabled={page === 1}>«</Pg>
            <Pg onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</Pg>
            <span className="px-2 text-muted-foreground tabular-nums">{page}/{pages}</span>
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
  return <button className={cn('h-8 min-w-8 rounded-md border border-border bg-card px-2 font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-card')} {...p}>{children}</button>;
}
