-- Penyimpanan isi TOR per komponen: narasi bagian, matriks tahapan, & opsi (RM/BLU).
-- section_id memakai kunci: DASAR_HUKUM, GAMBARAN_UMUM, MAKSUD_TUJUAN, OUTPUT_OUTCOME,
-- LINGKUP, PENERIMA_MANFAAT, METODE, TAHAPAN, PELAKSANA.

create table if not exists public.tor_narasi (
  usulan_id   uuid not null references public.usulan_anggaran(id) on delete cascade,
  komponen_id uuid not null references public.usulan_struktur(id) on delete cascade,
  section_id  text not null,
  teks        text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (usulan_id, komponen_id, section_id)
);

create table if not exists public.tor_tahapan (
  id            uuid primary key default gen_random_uuid(),
  usulan_id     uuid not null references public.usulan_anggaran(id) on delete cascade,
  komponen_id   uuid not null references public.usulan_struktur(id) on delete cascade,
  nama          text not null,
  urutan        int  not null default 0,
  bulan_mulai   int  not null default 1 check (bulan_mulai between 1 and 12),
  bulan_selesai int  not null default 1 check (bulan_selesai between 1 and 12)
);
create index if not exists idx_tor_tahapan_komp on public.tor_tahapan (usulan_id, komponen_id);

create table if not exists public.tor_komponen_opsi (
  usulan_id   uuid not null references public.usulan_anggaran(id) on delete cascade,
  komponen_id uuid not null references public.usulan_struktur(id) on delete cascade,
  sumber_dana text not null default 'RM',   -- 'RM' | 'BLU'
  primary key (usulan_id, komponen_id)
);

-- RLS: mengikuti pola usulan_struktur (akses bila usulan-nya terlihat).
alter table public.tor_narasi         enable row level security;
alter table public.tor_tahapan        enable row level security;
alter table public.tor_komponen_opsi  enable row level security;

drop policy if exists p_tor_narasi_all on public.tor_narasi;
create policy p_tor_narasi_all on public.tor_narasi for all to authenticated
  using (exists (select 1 from public.usulan_anggaran ua where ua.id = usulan_id))
  with check (exists (select 1 from public.usulan_anggaran ua where ua.id = usulan_id));

drop policy if exists p_tor_tahapan_all on public.tor_tahapan;
create policy p_tor_tahapan_all on public.tor_tahapan for all to authenticated
  using (exists (select 1 from public.usulan_anggaran ua where ua.id = usulan_id))
  with check (exists (select 1 from public.usulan_anggaran ua where ua.id = usulan_id));

drop policy if exists p_tor_opsi_all on public.tor_komponen_opsi;
create policy p_tor_opsi_all on public.tor_komponen_opsi for all to authenticated
  using (exists (select 1 from public.usulan_anggaran ua where ua.id = usulan_id))
  with check (exists (select 1 from public.usulan_anggaran ua where ua.id = usulan_id));

notify pgrst, 'reload schema';
