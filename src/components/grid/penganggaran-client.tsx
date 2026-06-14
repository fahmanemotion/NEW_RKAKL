'use client';
import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button, Card } from '@/components/ui';
import { flattenForGrid, type GridRow } from '@/lib/tree';
import { toolbarActions, type ToolbarAction } from '@/lib/toolbar';
import { fmtN, type Level } from '@/lib/constants';
import { usePenganggaran } from '@/store/penganggaran';
import {
  addNode, upsertDetail, deleteNode, fetchStruktur, refQueryFor, getAkunMeta,
} from '@/lib/penganggaran-api';
import type { UsulanStruktur } from '@/types/database';
import { TreeGrid } from './tree-grid';
import { ReferencePicker } from './reference-picker';
import { SubKomponenForm } from './subkomponen-form';
import { DetailForm, type DetailValues } from './detail-form';
import type { RefRow, RefQuery } from '@/lib/penganggaran-api';

export interface UsulanHeader {
  id: string;
  tahun_anggaran: number;
  status: string;
  ba: string;
  kementerian: string;
  unit: string;
  satker: string;
  program_kode: string;
  program_nama: string;
  kegiatan_id: string | null;
  kegiatan_kode: string;
  kegiatan_nama: string;
  kppn: string;
  lokus: string;
}

type PickerState = { level: Level; query: RefQuery; parentStrukturId: string | null; parentKode: string; okGreen?: boolean; extraHead?: string } | null;
type DetailState = {
  parentId: string;
  inheritedSumberDana: string;
  akunInfo?: { kode: string; uraian: string; sumberDana: string; kategori?: string };
  initial?: Partial<DetailValues>;
} | null;

export function PenganggaranClient({ header, initialRows }: { header: UsulanHeader; initialRows: UsulanStruktur[] }) {
  const [rows, setRows] = React.useState<UsulanStruktur[]>(initialRows);
  const { selectedId, selectedRow, select } = usePenganggaran();
  const [picker, setPicker] = React.useState<PickerState>(null);
  const [subkompParent, setSubkompParent] = React.useState<{ id: string } | null>(null);
  const [detail, setDetail] = React.useState<DetailState>(null);

  const refresh = React.useCallback(async () => setRows(await fetchStruktur(header.id)), [header.id]);

  // Realtime: segarkan grid saat struktur usulan ini berubah.
  React.useEffect(() => {
    const ch = createClient()
      .channel('struktur:' + header.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usulan_struktur', filter: `usulan_id=eq.${header.id}` }, refresh)
      .subscribe();
    return () => { createClient().removeChannel(ch); };
  }, [header.id, refresh]);

  const { gridRows, total } = React.useMemo(
    () => flattenForGrid(rows, { kppn: header.kppn, lokus: header.lokus }),
    [rows, header.kppn, header.lokus],
  );

  // Program & Kegiatan kini node nyata di pohon. Untuk usulan LAMA (belum punya
  // node PROGRAM), tampilkan baris Program/Kegiatan dari header sebagai fallback.
  const hasProgramNode = gridRows.some((r) => r.type === 'PROGRAM');
  const display: GridRow[] = React.useMemo(() => {
    if (hasProgramNode) return gridRows;
    if (!header.program_kode) return gridRows;
    return [
      { id: 'prog', type: 'PROGRAM', depth: 0, kode: header.program_kode, uraian: header.program_nama, jumlah: total, selectable: false },
      { id: 'keg', type: 'KEGIATAN', depth: 1, kode: header.kegiatan_kode, uraian: header.kegiatan_nama, jumlah: total, selectable: false },
      ...gridRows,
    ];
  }, [gridRows, header, total, hasProgramNode]);

  const selType = selectedRow?.type ?? null;
  const actions = toolbarActions(selType);

  function handleAction(a: ToolbarAction) {
    if (a.kind === 'delete') return onDelete();
    if (a.kind === 'edit') return onEditDetail();
    if (a.kind !== 'add' || !a.addLevel) return;
    openAdd(a.addLevel);
  }

  // Peta level anak → tipe parent yang harus dipilih + judul modal.
  const PARENT_OF: Record<string, GridRow['type']> = {
    KEGIATAN: 'PROGRAM', KRO: 'KEGIATAN', RO: 'KRO',
    KOMPONEN: 'RO', SUB_KOMPONEN: 'KOMPONEN', AKUN: 'SUB_KOMPONEN', DETAIL: 'AKUN',
  };

  async function openAdd(level: Level) {
    // PROGRAM = akar (tanpa induk).
    if (level === 'PROGRAM') {
      const q = refQueryFor('PROGRAM', null);
      if (!q) return;
      return setPicker({ level, query: q, parentStrukturId: null, parentKode: '022' });
    }
    // Level lain butuh baris induk terpilih.
    const needType = PARENT_OF[level];
    if (selectedRow?.type !== needType || !selectedRow.ref) {
      return alert(`Pilih baris ${needType} dulu untuk menambahkan ${level}.`);
    }
    const parentId = selectedRow.ref.id;
    const parentRef = selectedRow.ref.referensi_id ?? null;
    const parentKode = selectedRow.kode;

    if (level === 'SUB_KOMPONEN') return setSubkompParent({ id: parentId });
    if (level === 'DETAIL') {
      // Sumber dana & kategori detail otomatis ikut akun (parent).
      const akunSumber = selectedRow.sumber_dana ?? 'RM';
      let kategori: string | undefined;
      if (parentRef) {
        const meta = await getAkunMeta(parentRef);
        if (meta) kategori = meta.kategori_belanja;
      }
      return setDetail({
        parentId,
        inheritedSumberDana: akunSumber,
        akunInfo: { kode: selectedRow.kode, uraian: selectedRow.uraian, sumberDana: akunSumber, kategori },
      });
    }

    const q = refQueryFor(level, parentRef);
    if (!q) return;
    setPicker({
      level, query: q, parentStrukturId: parentId, parentKode,
      okGreen: level === 'KRO',
      extraHead: level === 'KOMPONEN' ? 'Jenis' : level === 'AKUN' ? 'Kategori' : undefined,
    });
  }

  async function onPickRef(row: RefRow) {
    if (!picker) return;
    const { level, parentStrukturId, parentKode } = picker;
    let kode = row.kode;
    if (level === 'PROGRAM') kode = `${parentKode}.${row.kode}`;       // 022.12.DL
    else if (level === 'KRO' || level === 'RO') kode = `${parentKode}.${row.kode}`; // 3996.SAB / 3996.SAB.005
    let sumber_dana: string | null = null;
    if (level === 'AKUN') {
      const meta = await getAkunMeta(row.id);
      sumber_dana = meta?.sumber_dana ?? (row.kode.startsWith('525') ? 'BLU' : 'RM');
    }
    await addNode({
      usulan_id: header.id,
      parent_id: parentStrukturId,
      level,
      referensi_id: row.id,
      kode,
      uraian: row.nama,
      sumber_dana,
    });
    setPicker(null);
    await refresh();
  }

  async function onSubmitSubkomp(v: { kode: string; uraian: string }) {
    if (!subkompParent) return;
    await addNode({
      usulan_id: header.id,
      parent_id: subkompParent.id,
      level: 'SUB_KOMPONEN',
      kode: v.kode === '-' ? '-' : v.kode,
      uraian: v.uraian,
    });
    setSubkompParent(null);
    await refresh();
  }

  async function onSubmitDetail(v: DetailValues) {
    if (!detail) return;
    await upsertDetail({
      id: v.id,
      usulan_id: header.id,
      parent_id: detail.parentId,
      uraian: v.uraian,
      volume: v.volume,
      satuan: v.satuan,
      harga: v.harga,
      sumber_dana: detail.inheritedSumberDana,  // ikut akun
      jenis_belanja: v.jenis_belanja,
    });
    setDetail(null);
    await refresh();
  }

  function onEditDetail() {
    if (selectedRow?.type !== 'DETAIL' || !selectedRow.ref) return;
    const r = selectedRow.ref;
    // Cari node AKUN induk untuk mewarisi sumber dana & info.
    const akun = rows.find((x) => x.id === r.parent_id);
    const akunSumber = akun?.sumber_dana ?? r.sumber_dana ?? 'RM';
    setDetail({
      parentId: r.parent_id!,
      inheritedSumberDana: akunSumber,
      akunInfo: akun ? { kode: akun.kode, uraian: akun.uraian, sumberDana: akunSumber } : undefined,
      initial: {
        id: r.id, uraian: r.uraian ?? '', volume: r.volume ?? 0, satuan: r.satuan ?? '',
        harga: r.harga ?? 0, jenis_belanja: (r.jenis_belanja as DetailValues['jenis_belanja']) ?? 'OPS',
      },
    });
  }

  async function onDelete() {
    if (!selectedRow?.ref) return;
    const t = selectedRow.type;
    const hasChildren = t !== 'DETAIL';
    const msg = hasChildren
      ? `Hapus ${t} "${selectedRow.uraian}" beserta SELURUH turunannya (sampai detail)?`
      : `Hapus detail "${selectedRow.uraian}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteNode(selectedRow.ref.id);
      select(null);
      await refresh();
    } catch (e) {
      alert('Gagal menghapus: ' + (e as Error).message);
    }
  }

  const iconFor = (a: ToolbarAction) => a.kind === 'edit' ? <Pencil className="size-4" /> : a.kind === 'delete' ? <Trash2 className="size-4" /> : <Plus className="size-4" />;

  return (
    <div className="space-y-4">
      {/* Header penganggaran */}
      <Card className="p-4">
        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tahun Anggaran" value={String(header.tahun_anggaran)} />
          <Field label="BA" value={`${header.ba}`} />
          <Field label="Status" value={header.status} />
          <Field label="Kementerian" value={header.kementerian} />
          <Field label="Unit Eselon I" value={header.unit} />
          <Field label="Satker" value={header.satker} />
        </div>
      </Card>

      {/* Toolbar dinamis + pagu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <Button
              key={a.key}
              variant={a.kind === 'delete' ? 'destructive' : a.kind === 'edit' ? 'secondary' : 'default'}
              size="sm"
              onClick={() => handleAction(a)}
            >
              {iconFor(a)} {a.kind === 'add' ? `${i + 1}. ` : ''}{a.label}
            </Button>
          ))}
        </div>
        <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Pagu : {fmtN(total)}
        </div>
      </div>

      <TreeGrid rows={display} selectedId={selectedId} onSelect={select} />

      <p className="text-xs text-muted-foreground">
        Klik baris untuk memilih — tombol menyesuaikan level (Program → Kegiatan → KRO → RO → Komponen → Sub Komponen → Akun → Detail).
        Jumlah & pagu dihitung otomatis oleh database.
      </p>

      {/* Modals */}
      {picker && (
        <ReferencePicker
          open
          title={
            picker.level === 'PROGRAM' ? 'Pilih Program'
              : picker.level === 'KEGIATAN' ? 'Pilih Kegiatan'
              : picker.level === 'KRO' ? 'Pilih KRO'
              : picker.level === 'RO' ? 'Pilih RO'
              : picker.level === 'KOMPONEN' ? 'Form Pencarian Komponen'
              : 'Form Pencarian Akun'
          }
          query={picker.query}
          extraHead={picker.extraHead}
          okGreen={picker.okGreen}
          onPick={onPickRef}
          onClose={() => setPicker(null)}
        />
      )}
      <SubKomponenForm open={!!subkompParent} onSubmit={onSubmitSubkomp} onClose={() => setSubkompParent(null)} />
      <DetailForm open={!!detail} initial={detail?.initial} akunInfo={detail?.akunInfo} onSubmit={onSubmitDetail} onClose={() => setDetail(null)} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
