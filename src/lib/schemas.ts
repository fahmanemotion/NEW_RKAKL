// SIPPT — skema validasi Zod (React Hook Form + Edge Function).
import { z } from 'zod';
import { LEVELS, STATUS, KATEGORI_BELANJA, SUMBER_DANA } from './constants';

export const usulanHeaderSchema = z.object({
  tahun_anggaran: z.coerce.number().int().gte(2020).lte(2100),
  satker_id: z.string().uuid(),
  program_id: z.string().uuid().optional().nullable(),
  kegiatan_id: z.string().uuid().optional().nullable(),
  status: z.enum(STATUS).default('Draft'),
});
export type UsulanHeaderInput = z.infer<typeof usulanHeaderSchema>;

// Node struktur tree-grid. DETAIL wajib volume & harga (>0); jumlah dihitung trigger.
export const strukturSchema = z
  .object({
    usulan_id: z.string().uuid(),
    parent_id: z.string().uuid().nullable().optional(),
    level: z.enum(LEVELS),
    referensi_id: z.string().uuid().nullable().optional(),
    kode: z.string().min(1, 'Kode wajib diisi').max(64),
    uraian: z.string().max(500).optional().default(''),
    volume: z.coerce.number().nonnegative().optional().default(0),
    satuan: z.string().max(32).optional().default(''),
    harga: z.coerce.number().nonnegative().optional().default(0),
    sumber_dana: z.enum(SUMBER_DANA).optional(),
    urutan: z.coerce.number().int().optional().default(0),
  })
  .refine((v) => v.level !== 'DETAIL' || (v.volume! > 0 && v.harga! > 0), {
    message: 'Detail belanja membutuhkan volume dan harga lebih dari 0',
    path: ['volume'],
  });
export type StrukturInput = z.infer<typeof strukturSchema>;

export const akunSchema = z.object({
  kode_akun: z.string().regex(/^\d{6}$/, 'Kode akun 6 digit'),
  nama_akun: z.string().min(3),
  kategori_belanja: z.enum(KATEGORI_BELANJA),
  sumber_dana: z.enum(SUMBER_DANA).default('RM'),
});
export type AkunInput = z.infer<typeof akunSchema>;

export const subKomponenSchema = z.object({
  komponen_id: z.string().uuid(),
  kode_sub_komponen: z.string().min(1).max(8),
  nama_sub_komponen: z.string().max(255).optional().default(''),
});

// Untuk upload kertas kerja (server-side: mime & ukuran divalidasi ulang di Edge Function).
export const uploadKertasKerjaSchema = z.object({
  usulan_id: z.string().uuid(),
  nama_file: z.string(),
  mime_type: z.enum([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel',                                          // xls
    'application/pdf',                                                   // pdf
  ]),
  file_size: z.number().max(20 * 1024 * 1024, 'Maksimal 20 MB'),
});
