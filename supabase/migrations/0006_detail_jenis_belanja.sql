-- ============================================================================
-- SIPPT — Migration 0006: kolom detail belanja ala SAKTI
--   jenis_belanja : 'OPS' (Operasional) | 'NON_OPS' (Non Operasional)
-- Sumber dana & kategori belanja TIDAK disimpan ulang di detail — keduanya
-- otomatis mengikuti akun (master_akun.sumber_dana & kategori_belanja),
-- sehingga konsisten dan mudah difilter lewat join ke akun.
-- ============================================================================

alter table usulan_struktur
  add column if not exists jenis_belanja text;

do $$ begin
  alter table usulan_struktur
    add constraint chk_jenis_belanja
    check (jenis_belanja is null or jenis_belanja in ('OPS','NON_OPS'));
exception when duplicate_object then null; end $$;

create index if not exists idx_struktur_jenis_belanja on usulan_struktur(jenis_belanja);

-- Kolom 'blokir' tidak dipakai lagi — hapus bila terlanjur dibuat sebelumnya.
alter table usulan_struktur drop column if exists blokir;

-- Segarkan schema cache PostgREST agar perubahan langsung dikenali API.
notify pgrst, 'reload schema';
