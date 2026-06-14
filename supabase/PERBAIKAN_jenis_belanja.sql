-- ============================================================================
-- PERBAIKAN cepat — error:
--   "Could not find the 'jenis_belanja' column of 'usulan_struktur'
--    in the schema cache"
--
-- Penyebab: kolom jenis_belanja belum ada di database (migrasi 0006 belum
-- dijalankan). Jalankan SELURUH isi file ini di Supabase → SQL Editor → Run.
-- Aman dijalankan berulang (idempotent).
-- ============================================================================

-- 1) Tambah kolom yang dibutuhkan form Detail.
alter table usulan_struktur
  add column if not exists jenis_belanja text;

-- 2) Batasi nilainya ke OPS / NON_OPS (boleh kosong).
do $$ begin
  alter table usulan_struktur
    add constraint chk_jenis_belanja
    check (jenis_belanja is null or jenis_belanja in ('OPS','NON_OPS'));
exception when duplicate_object then null; end $$;

create index if not exists idx_struktur_jenis_belanja on usulan_struktur(jenis_belanja);

-- 3) Hapus kolom 'blokir' bila terlanjur dibuat (tidak dipakai lagi).
alter table usulan_struktur drop column if exists blokir;

-- 4) Segarkan schema cache PostgREST agar API langsung mengenali kolom baru.
notify pgrst, 'reload schema';

-- 5) VERIFIKASI — baris ini harus mengembalikan satu baris berisi 'jenis_belanja'.
select column_name, data_type
from information_schema.columns
where table_name = 'usulan_struktur' and column_name = 'jenis_belanja';
