-- =====================================================================
-- KODE TOR: master metadata kinerja per KOMPONEN untuk mengisi tabel
-- identitas TOR yang tidak bisa diambil otomatis dari data anggaran.
-- Kunci = nama Komponen (case-insensitive). Diimpor via template Excel.
-- =====================================================================

create table if not exists public.master_tor_kode (
  id                          uuid primary key default gen_random_uuid(),
  komponen                    text not null,
  indikator_kinerja_kegiatan  text,
  sasaran_kegiatan            text,
  indikator_kinerja_program   text,
  sasaran_program             text,
  unit_eselon                 text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Unik per nama komponen (abaikan beda huruf besar/kecil).
create unique index if not exists uq_master_tor_kode_komponen
  on public.master_tor_kode (lower(komponen));

-- RLS: semua user login boleh BACA; hanya Administrator boleh TULIS
-- (sama seperti master referensi lain).
alter table public.master_tor_kode enable row level security;
drop policy if exists p_read on public.master_tor_kode;
create policy p_read on public.master_tor_kode
  for select to authenticated using (true);
drop policy if exists p_write on public.master_tor_kode;
create policy p_write on public.master_tor_kode
  for all to authenticated using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';
