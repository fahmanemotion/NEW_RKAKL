'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button, Select, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase';
import { createUsulanAction } from '@/app/(dashboard)/penganggaran/actions';

interface Prog { id: string; kode_program: string; nama_program: string }
interface Keg { id: string; program_id: string; kode_kegiatan: string; nama_kegiatan: string }

export function NewUsulanButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [progs, setProgs] = React.useState<Prog[]>([]);
  const [kegs, setKegs] = React.useState<Keg[]>([]);
  const [programId, setProgramId] = React.useState('');
  const [kegiatanId, setKegiatanId] = React.useState('');
  const [tahun, setTahun] = React.useState(new Date().getFullYear() + 1);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null); setProgramId(''); setKegiatanId(''); setLoading(true);
    const sb = createClient();
    Promise.all([
      sb.from('master_program').select('id, kode_program, nama_program').order('kode_program'),
      sb.from('master_kegiatan').select('id, program_id, kode_kegiatan, nama_kegiatan').order('kode_kegiatan'),
    ]).then(([p, k]) => {
      setProgs((p.data ?? []) as Prog[]);
      setKegs((k.data ?? []) as Keg[]);
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [open]);

  const kegOptions = kegs.filter((k) => k.program_id === programId);

  async function submit() {
    if (!programId) return setErr('Pilih Program dulu.');
    if (!kegiatanId) return setErr('Pilih Kegiatan dulu.');
    setBusy(true); setErr(null);
    try {
      const id = await createUsulanAction({ programId, kegiatanId, tahun });
      router.push(`/penganggaran/${id}`);
    } catch (e) {
      setErr((e as Error).message); setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Buat Usulan</Button>
      <Modal
        open={open} onClose={() => setOpen(false)} title="Buat Usulan Anggaran"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={busy || loading}>
            {busy && <Loader2 className="size-4 animate-spin" />} Buat & Buka
          </Button>
        </>}
      >
        {loading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <Field label="Tahun Anggaran">
              <Input type="number" value={tahun} onChange={(e) => setTahun(+e.target.value)} className="max-w-[140px]" />
            </Field>
            <Field label="Program">
              <Select value={programId} onChange={(e) => { setProgramId(e.target.value); setKegiatanId(''); }}>
                <option value="">— pilih Program —</option>
                {progs.map((p) => <option key={p.id} value={p.id}>{p.kode_program} — {p.nama_program}</option>)}
              </Select>
            </Field>
            <Field label="Kegiatan">
              <Select value={kegiatanId} onChange={(e) => setKegiatanId(e.target.value)} disabled={!programId}>
                <option value="">{programId ? '— pilih Kegiatan —' : 'pilih Program dulu'}</option>
                {kegOptions.map((k) => <option key={k.id} value={k.id}>{k.kode_kegiatan} — {k.nama_kegiatan}</option>)}
              </Select>
            </Field>
            {programId && kegOptions.length === 0 && (
              <p className="text-xs text-amber-600">Program ini belum punya Kegiatan di referensi. Tambahkan dulu di menu Referensi.</p>
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
