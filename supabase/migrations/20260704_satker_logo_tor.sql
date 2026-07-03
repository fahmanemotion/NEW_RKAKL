-- Logo TOR: logo instansi yang dipasang di SAMPUL dokumen TOR/KAK.
-- Terpisah dari kolom `logo` (dipakai di topnav aplikasi).
alter table public.master_satker
  add column if not exists logo_tor text;

notify pgrst, 'reload schema';
