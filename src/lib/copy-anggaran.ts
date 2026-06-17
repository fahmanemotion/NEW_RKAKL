// SIPPT — penyalinan struktur usulan (murni & bisa diuji di Node).
// Memetakan seluruh baris usulan_struktur dari satu usulan ke usulan lain:
// membuat id baru, memetakan ulang parent_id, dan mengelompokkan per kedalaman
// level sehingga induk selalu disisipkan sebelum anak (aman untuk FK).

import type { UsulanStruktur } from "@/types/database";

export const LEVEL_DEPTH: Record<string, number> = {
  PROGRAM: 0,
  KEGIATAN: 1,
  KRO: 2,
  RO: 3,
  KOMPONEN: 4,
  SUB_KOMPONEN: 5,
  AKUN: 6,
  DETAIL: 7,
};

export interface CopyRecord {
  id: string;
  usulan_id: string;
  parent_id: string | null;
  level: string;
  referensi_id: string | null;
  kode: string | null;
  uraian: string | null;
  volume: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  sumber_dana: string | null;
  jenis_belanja: string | null;
  urutan: number;
}

/**
 * Hasilkan batch-batch (terurut dari level paling dangkal ke paling dalam)
 * berisi salinan baris untuk disisipkan ke usulan tujuan.
 *
 * @param rows   baris sumber (boleh tak terurut)
 * @param target id usulan tujuan
 * @param genId  pembuat id baru (mis. () => crypto.randomUUID())
 */
export function remapStruktur(
  rows: UsulanStruktur[],
  target: string,
  genId: () => string,
): CopyRecord[][] {
  const idMap = new Map<string, string>();
  for (const r of rows) idMap.set(r.id, genId());

  const byLevel = new Map<number, CopyRecord[]>();
  for (const r of rows) {
    const d = LEVEL_DEPTH[r.level] ?? 0;
    const rec: CopyRecord = {
      id: idMap.get(r.id)!,
      usulan_id: target,
      parent_id: r.parent_id ? (idMap.get(r.parent_id) ?? null) : null,
      level: r.level,
      referensi_id: r.referensi_id,
      kode: r.kode,
      uraian: r.uraian,
      volume: r.volume,
      satuan: r.satuan,
      harga: r.harga,
      jumlah: r.jumlah,
      sumber_dana: r.sumber_dana,
      jenis_belanja: r.jenis_belanja,
      urutan: r.urutan,
    };
    const arr = byLevel.get(d) ?? [];
    arr.push(rec);
    byLevel.set(d, arr);
  }

  return [...byLevel.keys()]
    .sort((a, b) => a - b)
    .map((d) => byLevel.get(d)!);
}
