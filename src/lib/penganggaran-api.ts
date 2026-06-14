// SIPPT — operasi penganggaran via Supabase (browser client). RLS membatasi tulis ke Administrator.
import { createClient } from '@/lib/supabase';
import type { Level, UsulanStruktur } from '@/types/database';
import { refQueryFor, type RefQuery } from '@/lib/ref-query';

export { refQueryFor };
export type { RefQuery };

const sb = () => createClient();

export interface PathCtx {
  usulan_id: string;
  parent_id: string | null;
}

/** Tambah node struktur (KRO/RO/KOMPONEN/SUB_KOMPONEN/AKUN). */
export async function addNode(input: {
  usulan_id: string;
  parent_id: string | null;
  level: Level;
  referensi_id?: string | null;
  kode: string;
  uraian: string;
  satuan?: string | null;
  sumber_dana?: string | null;
}): Promise<UsulanStruktur> {
  const urutan = await nextUrutan(input.usulan_id, input.parent_id);
  const { data, error } = await sb()
    .from('usulan_struktur')
    .insert({ ...input, urutan, volume: 0, harga: 0, jumlah: 0 })
    .select('*')
    .single();
  if (error) throw error;
  return data as UsulanStruktur;
}

/** Tambah / ubah Detail Belanja (jumlah dihitung trigger DB). */
export async function upsertDetail(input: {
  id?: string;
  usulan_id: string;
  parent_id: string;        // id AKUN
  uraian: string;
  volume: number;
  satuan: string;
  harga: number;
  sumber_dana?: string | null;   // diwarisi dari akun
  jenis_belanja?: string | null; // 'OPS' | 'NON_OPS'
}): Promise<void> {
  const payload = {
    usulan_id: input.usulan_id,
    parent_id: input.parent_id,
    level: 'DETAIL' as Level,
    uraian: input.uraian,
    volume: input.volume,
    satuan: input.satuan,
    harga: input.harga,
    sumber_dana: input.sumber_dana ?? null,
    jenis_belanja: input.jenis_belanja ?? null,
  };
  if (input.id) {
    const { error } = await sb().from('usulan_struktur').update(payload).eq('id', input.id);
    if (error) throw error;
  } else {
    const urutan = await nextUrutan(input.usulan_id, input.parent_id);
    const { error } = await sb().from('usulan_struktur').insert({ ...payload, urutan });
    if (error) throw error;
  }
}

/** Metadata akun (sumber dana & kategori) untuk diwariskan ke detail. */
export async function getAkunMeta(masterAkunId: string): Promise<{ sumber_dana: string; kategori_belanja: string } | null> {
  const { data } = await sb()
    .from('master_akun')
    .select('sumber_dana, kategori_belanja')
    .eq('id', masterAkunId)
    .single();
  if (!data) return null;
  return {
    sumber_dana: ((data as Record<string, unknown>).sumber_dana as string) ?? 'RM',
    kategori_belanja: ((data as Record<string, unknown>).kategori_belanja as string) ?? '',
  };
}

export async function deleteNode(id: string): Promise<void> {
  const { error } = await sb().from('usulan_struktur').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchStruktur(usulan_id: string): Promise<UsulanStruktur[]> {
  const { data, error } = await sb()
    .from('usulan_struktur')
    .select('*')
    .eq('usulan_id', usulan_id)
    .order('urutan', { ascending: true });
  if (error) throw error;
  return (data ?? []) as UsulanStruktur[];
}

async function nextUrutan(usulan_id: string, parent_id: string | null): Promise<number> {
  let q = sb().from('usulan_struktur').select('urutan').eq('usulan_id', usulan_id);
  q = parent_id ? q.eq('parent_id', parent_id) : q.is('parent_id', null);
  const { data } = await q.order('urutan', { ascending: false }).limit(1);
  return ((data?.[0]?.urutan as number) ?? -1) + 1;
}

/* ── Pencarian referensi (server-side: ilike + range + count) untuk MODUL 3 ── */
export interface RefRow { id: string; kode: string; nama: string; extra?: string }

export async function searchReference(
  cfg: RefQuery,
  q: string,
  page: number,
  perPage: number,
): Promise<{ rows: RefRow[]; total: number }> {
  const from = (page - 1) * perPage;
  let query = sb()
    .from(cfg.table)
    .select(
      `id, ${cfg.kodeCol}, ${cfg.namaCol}${cfg.extraCol ? `, ${cfg.extraCol}` : ''}`,
      { count: 'exact' },
    );
  if (cfg.parentCol && cfg.parentId) query = query.eq(cfg.parentCol, cfg.parentId);
  if (q.trim()) query = query.or(`${cfg.kodeCol}.ilike.%${q}%,${cfg.namaCol}.ilike.%${q}%`);
  query = query.order(cfg.kodeCol, { ascending: true }).range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  const rows: RefRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    kode: r[cfg.kodeCol] as string,
    nama: r[cfg.namaCol] as string,
    extra: cfg.extraCol ? (r[cfg.extraCol] as string) : undefined,
  }));
  return { rows, total: count ?? 0 };
}

