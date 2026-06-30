-- =====================================================================
-- Lapisan kunci keras KRO (penganggaran kolaboratif)
-- Menambahkan kolom klaim pada usulan_struktur agar dua pengguna tidak
-- dapat mengerjakan KRO yang sama (klaim atomik di aplikasi).
--
-- Aman dijalankan berulang (idemponen). Jalankan di Supabase Studio →
-- SQL Editor, atau via `supabase db push` bila memakai CLI.
-- =====================================================================

alter table public.usulan_struktur
  add column if not exists dikerjakan_oleh      uuid,
  add column if not exists dikerjakan_oleh_nama text,
  add column if not exists dikerjakan_pada      timestamptz;

-- Pencarian cepat KRO yang sedang dikerjakan.
create index if not exists idx_usulan_struktur_dikerjakan_oleh
  on public.usulan_struktur (dikerjakan_oleh)
  where dikerjakan_oleh is not null;

-- Segarkan cache skema PostgREST agar kolom langsung dikenali API.
notify pgrst, 'reload schema';

-- Catatan:
-- • Jika RLS aktif pada usulan_struktur, pastikan policy UPDATE yang sudah ada
--   (yang dipakai saat menyimpan anggaran) juga mengizinkan update kolom-kolom
--   ini — tidak perlu policy baru karena ini update biasa pada baris yang sama.
-- • Tidak dibuat foreign key ke auth.users agar migrasi tidak bergantung pada
--   skema auth; nilai yang disimpan adalah id pengguna (uuid) dari sesi.
