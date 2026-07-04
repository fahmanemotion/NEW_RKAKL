-- Peran penandatangan: menentukan penempatan tanda tangan pada dokumen (TOR/RAB).
-- Nilai yang dipakai: 'Mengetahui' (kiri) dan 'KPA' (kanan).
alter table public.master_penandatangan
  add column if not exists peran text;

notify pgrst, 'reload schema';
