// SIPPT — tipe database (ringkas; di proyek nyata di-generate via
// `supabase gen types typescript --local > src/types/database.ts`).

export type Level = 'PROGRAM' | 'KEGIATAN' | 'KRO' | 'RO' | 'KOMPONEN' | 'SUB_KOMPONEN' | 'AKUN' | 'DETAIL';
export type StatusUsulan = 'Draft' | 'Diajukan' | 'Direview' | 'Disetujui' | 'Final';
export type KategoriBelanja =
  | 'Belanja Pegawai' | 'Belanja Barang' | 'Belanja Modal';

export interface MasterRef { id: string; kode: string; nama: string }

/** Segmen volume bertingkat tersimpan (mis. {qty:15, sat:"Org"}). */
export interface VolRincianSegmen { qty: number; sat: string }

export interface UsulanAnggaran {
  id: string;
  tahun_anggaran: number;
  satker_id: string;
  program_id: string | null;
  kegiatan_id: string | null;
  status: StatusUsulan;
  total_anggaran: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsulanStruktur {
  id: string;
  usulan_id: string;
  parent_id: string | null;
  level: Level;
  referensi_id: string | null;
  kode: string | null;
  uraian: string | null;
  volume: number | null;
  satuan: string | null;
  harga: number | null;
  jumlah: number;
  sumber_dana: string | null;
  jenis_belanja: string | null;
  volume_rincian: VolRincianSegmen[] | null;
  urutan: number;
  dikerjakan_oleh: string | null;
  dikerjakan_oleh_nama: string | null;
  dikerjakan_pada: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterAkun {
  id: string;
  kode_akun: string;
  nama_akun: string;
  kategori_belanja: KategoriBelanja;
  sumber_dana: string | null;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  nama_tabel: string;
  aksi: 'INSERT' | 'UPDATE' | 'DELETE';
  row_id: string | null;
  data_lama: unknown;
  data_baru: unknown;
  created_at: string;
}

// Generik minimal agar createClient<Database>() bertipe.
// Ganti dengan hasil `supabase gen types` untuk tipe penuh tiap tabel.
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      level_struktur: Level;
      status_usulan: StatusUsulan;
      kategori_belanja: KategoriBelanja;
    };
  };
}
