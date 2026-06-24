-- 0018 — Pengaturan RAB: tempat (kota) & tanggal yang dicetak pada laporan RAB.
-- Satu baris singleton (id = 1). Bila tanggal NULL → RAB memakai tanggal hari ini
-- saat laporan dibuat (perilaku lama dipertahankan).

create table if not exists pengaturan_rab (
  id         smallint primary key default 1,
  kota       text not null default 'Makassar',
  tanggal    date,
  updated_at timestamptz not null default now(),
  constraint pengaturan_rab_singleton check (id = 1)
);

comment on table pengaturan_rab is
  'Pengaturan tempat (kota) & tanggal yang dicetak pada laporan RAB. Satu baris, id=1; tanggal NULL = pakai hari ini.';

insert into pengaturan_rab (id, kota, tanggal)
  values (1, 'Makassar', null)
  on conflict (id) do nothing;

alter table pengaturan_rab enable row level security;

drop policy if exists p_read on pengaturan_rab;
create policy p_read on pengaturan_rab
  for select to authenticated using (true);

drop policy if exists p_write on pengaturan_rab;
create policy p_write on pengaturan_rab
  for all to authenticated using (is_admin()) with check (is_admin());
