-- Tambah Indikator RO & Indikator KRO ke KODE TOR (diisi user via template).
alter table public.master_tor_kode
  add column if not exists indikator_ro  text,
  add column if not exists indikator_kro text;

notify pgrst, 'reload schema';
