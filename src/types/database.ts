// SIPPT — tipe database.
// Idealnya di-generate via `supabase gen types typescript`. Karena lingkungan
// dev tidak selalu terhubung ke DB, tipe ini ditulis tangan mengikuti skema
// migrasi (supabase/migrations) + kolom yang dipakai aplikasi. Bentuknya
// MENGIKUTI kontrak Supabase (Tables → Row/Insert/Update/Relationships) agar
// hasil query ber-tipe nyata (bukan `never`) dan embedded select ter-resolve.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Level = 'PROGRAM' | 'KEGIATAN' | 'KRO' | 'RO' | 'KOMPONEN' | 'SUB_KOMPONEN' | 'AKUN' | 'HEADER' | 'DETAIL';
export type StatusUsulan = 'Draft' | 'Diajukan' | 'Direview' | 'Disetujui' | 'Final';
export type KategoriBelanja = 'Belanja Pegawai' | 'Belanja Barang' | 'Belanja Modal';
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

/** Segmen volume bertingkat tersimpan (mis. {qty:15, sat:"Org"}). */
export interface VolRincianSegmen { qty: number; sat: string }
export interface MasterRef { id: string; kode: string; nama: string }

type FK = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/* ── Row types per tabel (selaras skema + pemakaian aplikasi) ─────────────── */

export type MasterBaRow = {
  id: string; kode_ba: string; nama_ba: string;
  created_at: string; updated_at: string;
}
export type MasterKementerianRow = {
  id: string; ba_id: string; kode: string; nama: string;
  created_at: string; updated_at: string;
}
export type MasterUnitEselon1Row = {
  id: string; kementerian_id: string; kode: string; nama: string;
  created_at: string; updated_at: string;
}
export type MasterSatkerRow = {
  id: string; unit_id: string | null; kode_satker: string; nama_satker: string;
  kppn: string | null; lokus: string | null; logo: string | null;
  created_at: string; updated_at: string;
}
export type MasterProgramRow = {
  id: string; ba_id: string; kode_program: string; nama_program: string;
  created_at: string; updated_at: string;
}
export type MasterKegiatanRow = {
  id: string; program_id: string; kode_kegiatan: string; nama_kegiatan: string;
  created_at: string; updated_at: string;
}
export type MasterKroRow = {
  id: string; kegiatan_id: string; kode_kro: string; nama_kro: string;
  satuan: string | null; created_at: string; updated_at: string;
}
export type MasterRoRow = {
  id: string; kro_id: string; kode_ro: string; nama_ro: string;
  satuan: string | null; created_at: string; updated_at: string;
}
export type MasterKomponenRow = {
  id: string; ro_id: string; kode_komponen: string; nama_komponen: string;
  jenis: string | null; created_at: string; updated_at: string;
}
export type MasterSubKomponenRow = {
  id: string; komponen_id: string; kode_sub_komponen: string; nama_sub_komponen: string;
  created_at: string; updated_at: string;
}
export type MasterAkunRow = {
  id: string; kode_akun: string; nama_akun: string;
  kategori_belanja: KategoriBelanja; sumber_dana: string | null;
  created_at: string; updated_at: string;
}
export type MasterPenandatanganRow = {
  id: string; nama: string; jabatan: string | null;
  pangkat_golongan: string | null; nip: string | null;
  created_at: string; updated_at: string;
}
export type RoleRow = {
  id: string; nama: string; deskripsi: string | null; created_at: string;
}
export type UserProfileRow = {
  id: string; nama: string | null; nip: string | null; jabatan: string | null;
  satker_id: string | null; role_id: string | null; foto_profil: string | null;
  created_at: string; updated_at: string;
}
export type PermissionRow = {
  id: string; role_id: string; module_name: string;
  can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean;
}
export type UsulanAnggaranRow = {
  id: string; tahun_anggaran: number; satker_id: string;
  program_id: string | null; kegiatan_id: string | null;
  status: StatusUsulan; tahap_pagu: string | null; total_anggaran: number;
  created_by: string | null; reviewed_by: string | null; approved_by: string | null;
  created_at: string; updated_at: string;
}
export type UsulanStrukturRow = {
  id: string; usulan_id: string; parent_id: string | null; level: Level;
  referensi_id: string | null; kode: string | null; uraian: string | null;
  volume: number | null; satuan: string | null; harga: number | null; jumlah: number;
  sumber_dana: string | null; jenis_belanja: string | null;
  volume_rincian: VolRincianSegmen[] | null; urutan: number;
  dikerjakan_oleh: string | null; dikerjakan_oleh_nama: string | null; dikerjakan_pada: string | null;
  created_at: string; updated_at: string;
}
export type DokumenKertasKerjaRow = {
  id: string; usulan_id: string; nama_file: string; file_path: string;
  file_size: number | null; mime_type: string | null;
  uploaded_by: string | null; uploaded_at: string;
}
export type AuditLogRow = {
  id: number; user_id: string | null; nama_tabel: string; aksi: AuditAction;
  row_id: string | null; data_lama: Json | null; data_baru: Json | null; created_at: string;
}
export type PengaturanRabRow = {
  id: number; kota: string; tanggal: string | null; updated_at: string;
}
export type UserSessionRow = {
  user_id: string; session_id: string; user_agent: string | null;
  created_at: string; last_seen: string;
}

/* ── Alias kompatibilitas (dipakai modul lain) ───────────────────────────── */
export type UsulanAnggaran = UsulanAnggaranRow;
export type UsulanStruktur = UsulanStrukturRow;
export type MasterAkun = MasterAkunRow;
export interface AuditLog extends Omit<AuditLogRow, 'data_lama' | 'data_baru'> {
  data_lama: unknown; data_baru: unknown;
}

/* ── Helper bentuk tabel: Insert/Update permisif (Partial dari Row) ───────── */
type Tbl<R, Rel extends FK[] = []> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: Rel;
};

export interface Database {
  public: {
    Tables: {
      master_ba: Tbl<MasterBaRow>;
      master_kementerian: Tbl<MasterKementerianRow, [
        { foreignKeyName: 'master_kementerian_ba_id_fkey'; columns: ['ba_id']; isOneToOne: false; referencedRelation: 'master_ba'; referencedColumns: ['id'] },
      ]>;
      master_unit_eselon1: Tbl<MasterUnitEselon1Row, [
        { foreignKeyName: 'master_unit_eselon1_kementerian_id_fkey'; columns: ['kementerian_id']; isOneToOne: false; referencedRelation: 'master_kementerian'; referencedColumns: ['id'] },
      ]>;
      master_satker: Tbl<MasterSatkerRow, [
        { foreignKeyName: 'master_satker_unit_id_fkey'; columns: ['unit_id']; isOneToOne: false; referencedRelation: 'master_unit_eselon1'; referencedColumns: ['id'] },
      ]>;
      master_program: Tbl<MasterProgramRow, [
        { foreignKeyName: 'master_program_ba_id_fkey'; columns: ['ba_id']; isOneToOne: false; referencedRelation: 'master_ba'; referencedColumns: ['id'] },
      ]>;
      master_kegiatan: Tbl<MasterKegiatanRow, [
        { foreignKeyName: 'master_kegiatan_program_id_fkey'; columns: ['program_id']; isOneToOne: false; referencedRelation: 'master_program'; referencedColumns: ['id'] },
      ]>;
      master_kro: Tbl<MasterKroRow, [
        { foreignKeyName: 'master_kro_kegiatan_id_fkey'; columns: ['kegiatan_id']; isOneToOne: false; referencedRelation: 'master_kegiatan'; referencedColumns: ['id'] },
      ]>;
      master_ro: Tbl<MasterRoRow, [
        { foreignKeyName: 'master_ro_kro_id_fkey'; columns: ['kro_id']; isOneToOne: false; referencedRelation: 'master_kro'; referencedColumns: ['id'] },
      ]>;
      master_komponen: Tbl<MasterKomponenRow, [
        { foreignKeyName: 'master_komponen_ro_id_fkey'; columns: ['ro_id']; isOneToOne: false; referencedRelation: 'master_ro'; referencedColumns: ['id'] },
      ]>;
      master_sub_komponen: Tbl<MasterSubKomponenRow, [
        { foreignKeyName: 'master_sub_komponen_komponen_id_fkey'; columns: ['komponen_id']; isOneToOne: false; referencedRelation: 'master_komponen'; referencedColumns: ['id'] },
      ]>;
      master_akun: Tbl<MasterAkunRow>;
      master_penandatangan: Tbl<MasterPenandatanganRow>;
      roles: Tbl<RoleRow>;
      permissions: Tbl<PermissionRow, [
        { foreignKeyName: 'permissions_role_id_fkey'; columns: ['role_id']; isOneToOne: false; referencedRelation: 'roles'; referencedColumns: ['id'] },
      ]>;
      user_profiles: Tbl<UserProfileRow, [
        { foreignKeyName: 'user_profiles_satker_id_fkey'; columns: ['satker_id']; isOneToOne: false; referencedRelation: 'master_satker'; referencedColumns: ['id'] },
        { foreignKeyName: 'user_profiles_role_id_fkey'; columns: ['role_id']; isOneToOne: false; referencedRelation: 'roles'; referencedColumns: ['id'] },
      ]>;
      usulan_anggaran: Tbl<UsulanAnggaranRow, [
        { foreignKeyName: 'usulan_anggaran_satker_id_fkey'; columns: ['satker_id']; isOneToOne: false; referencedRelation: 'master_satker'; referencedColumns: ['id'] },
        { foreignKeyName: 'usulan_anggaran_program_id_fkey'; columns: ['program_id']; isOneToOne: false; referencedRelation: 'master_program'; referencedColumns: ['id'] },
        { foreignKeyName: 'usulan_anggaran_kegiatan_id_fkey'; columns: ['kegiatan_id']; isOneToOne: false; referencedRelation: 'master_kegiatan'; referencedColumns: ['id'] },
      ]>;
      usulan_struktur: Tbl<UsulanStrukturRow, [
        { foreignKeyName: 'usulan_struktur_usulan_id_fkey'; columns: ['usulan_id']; isOneToOne: false; referencedRelation: 'usulan_anggaran'; referencedColumns: ['id'] },
        { foreignKeyName: 'usulan_struktur_parent_id_fkey'; columns: ['parent_id']; isOneToOne: false; referencedRelation: 'usulan_struktur'; referencedColumns: ['id'] },
      ]>;
      dokumen_kertas_kerja: Tbl<DokumenKertasKerjaRow, [
        { foreignKeyName: 'dokumen_kertas_kerja_usulan_id_fkey'; columns: ['usulan_id']; isOneToOne: false; referencedRelation: 'usulan_anggaran'; referencedColumns: ['id'] },
      ]>;
      audit_logs: Tbl<AuditLogRow>;
      pengaturan_rab: Tbl<PengaturanRabRow>;
      user_sessions: Tbl<UserSessionRow>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      level_struktur: Level;
      status_usulan: StatusUsulan;
      kategori_belanja: KategoriBelanja;
      audit_action: AuditAction;
    };
    CompositeTypes: Record<never, never>;
  };
}
