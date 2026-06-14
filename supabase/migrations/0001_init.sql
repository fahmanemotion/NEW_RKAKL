-- ============================================================================
-- SIPPT — Sistem Informasi Perencanaan dan Penganggaran Terintegrasi
-- Migration 0001: extensions, enums, dan seluruh tabel (master + transaksi).
-- Dijalankan di Supabase SQL Editor / `supabase db push`.
-- ============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid()

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type kategori_belanja as enum
    ('Belanja Pegawai','Belanja Barang','Belanja Modal','Belanja Operasional','Belanja Non Operasional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type level_struktur as enum
    ('KRO','RO','KOMPONEN','SUB_KOMPONEN','AKUN','DETAIL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_usulan as enum
    ('Draft','Diajukan','Direview','Disetujui','Final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_action as enum ('INSERT','UPDATE','DELETE');
exception when duplicate_object then null; end $$;

-- ── Master Data ─────────────────────────────────────────────────────────────
create table if not exists master_ba (
  id          uuid primary key default gen_random_uuid(),
  kode_ba     text not null unique,
  nama_ba     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists master_kementerian (
  id          uuid primary key default gen_random_uuid(),
  ba_id       uuid not null references master_ba(id) on delete cascade,
  kode        text not null,
  nama        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (ba_id, kode)
);

create table if not exists master_unit_eselon1 (
  id              uuid primary key default gen_random_uuid(),
  kementerian_id  uuid not null references master_kementerian(id) on delete cascade,
  kode            text not null,
  nama            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (kementerian_id, kode)
);

create table if not exists master_satker (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid references master_unit_eselon1(id) on delete set null,
  kode_satker text not null unique,
  nama_satker text not null,
  kppn        text,
  lokus       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists master_program (
  id            uuid primary key default gen_random_uuid(),
  ba_id         uuid not null references master_ba(id) on delete cascade,
  kode_program  text not null,
  nama_program  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (ba_id, kode_program)
);

create table if not exists master_kegiatan (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references master_program(id) on delete cascade,
  kode_kegiatan text not null,
  nama_kegiatan text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (program_id, kode_kegiatan)
);

create table if not exists master_kro (
  id           uuid primary key default gen_random_uuid(),
  kegiatan_id  uuid not null references master_kegiatan(id) on delete cascade,
  kode_kro     text not null,
  nama_kro     text not null,
  satuan       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (kegiatan_id, kode_kro)
);

create table if not exists master_ro (
  id          uuid primary key default gen_random_uuid(),
  kro_id      uuid not null references master_kro(id) on delete cascade,
  kode_ro     text not null,
  nama_ro     text not null,
  satuan      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kro_id, kode_ro)
);

create table if not exists master_komponen (
  id            uuid primary key default gen_random_uuid(),
  ro_id         uuid not null references master_ro(id) on delete cascade,
  kode_komponen text not null,
  nama_komponen text not null,
  jenis         text,                              -- 'Utama' | 'Pendukung'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (ro_id, kode_komponen)
);

create table if not exists master_sub_komponen (
  id                uuid primary key default gen_random_uuid(),
  komponen_id       uuid not null references master_komponen(id) on delete cascade,
  kode_sub_komponen text not null,
  nama_sub_komponen text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (komponen_id, kode_sub_komponen)
);

create table if not exists master_akun (
  id               uuid primary key default gen_random_uuid(),
  kode_akun        text not null unique,
  nama_akun        text not null,
  kategori_belanja kategori_belanja not null,
  sumber_dana      text default 'RM',             -- RM | BLU | SBSN
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Otorisasi / Pengguna ────────────────────────────────────────────────────
create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,               -- Administrator | Operator | Reviewer | Pimpinan
  deskripsi   text,
  created_at  timestamptz not null default now()
);

create table if not exists user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text,
  nip         text,
  jabatan     text,
  satker_id   uuid references master_satker(id) on delete set null,
  role_id     uuid references roles(id) on delete set null,
  foto_profil text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists permissions (
  id          uuid primary key default gen_random_uuid(),
  role_id     uuid not null references roles(id) on delete cascade,
  module_name text not null,
  can_create  boolean not null default false,
  can_read    boolean not null default false,
  can_update  boolean not null default false,
  can_delete  boolean not null default false,
  unique (role_id, module_name)
);

-- ── Transaksi Usulan ────────────────────────────────────────────────────────
create table if not exists usulan_anggaran (
  id             uuid primary key default gen_random_uuid(),
  tahun_anggaran integer not null,
  satker_id      uuid not null references master_satker(id) on delete restrict,
  program_id     uuid references master_program(id) on delete set null,
  kegiatan_id    uuid references master_kegiatan(id) on delete set null,
  status         status_usulan not null default 'Draft',
  total_anggaran numeric(18,2) not null default 0,
  created_by     uuid references auth.users(id) on delete set null,
  reviewed_by    uuid references auth.users(id) on delete set null,
  approved_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists usulan_struktur (
  id           uuid primary key default gen_random_uuid(),
  usulan_id    uuid not null references usulan_anggaran(id) on delete cascade,
  parent_id    uuid references usulan_struktur(id) on delete cascade,
  level        level_struktur not null,
  referensi_id uuid,                               -- id master sesuai level (kro/ro/komponen/akun…)
  kode         text,
  uraian       text,
  volume       numeric(18,2) default 0,
  satuan       text,
  harga        numeric(18,2) default 0,
  jumlah       numeric(18,2) not null default 0,
  sumber_dana  text,
  urutan       integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists dokumen_kertas_kerja (
  id          uuid primary key default gen_random_uuid(),
  usulan_id   uuid not null references usulan_anggaran(id) on delete cascade,
  nama_file   text not null,
  file_path   text not null,                       -- path di Supabase Storage
  file_size   bigint,
  mime_type   text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

-- ── Audit Log ───────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid,
  nama_tabel  text not null,
  aksi        audit_action not null,
  row_id      text,
  data_lama   jsonb,
  data_baru   jsonb,
  created_at  timestamptz not null default now()
);

-- ── Index untuk pencarian & navigasi tree ──────────────────────────────────
create index if not exists idx_program_ba          on master_program(ba_id);
create index if not exists idx_kegiatan_program     on master_kegiatan(program_id);
create index if not exists idx_kro_kegiatan         on master_kro(kegiatan_id);
create index if not exists idx_ro_kro               on master_ro(kro_id);
create index if not exists idx_komponen_ro          on master_komponen(ro_id);
create index if not exists idx_subkomp_komponen     on master_sub_komponen(komponen_id);
create index if not exists idx_akun_kategori        on master_akun(kategori_belanja);
create index if not exists idx_struktur_usulan      on usulan_struktur(usulan_id);
create index if not exists idx_struktur_parent      on usulan_struktur(parent_id);
create index if not exists idx_struktur_usulan_urut on usulan_struktur(usulan_id, parent_id, urutan);
create index if not exists idx_usulan_satker_tahun  on usulan_anggaran(satker_id, tahun_anggaran);
create index if not exists idx_usulan_status        on usulan_anggaran(status);
create index if not exists idx_audit_tabel          on audit_logs(nama_tabel, created_at desc);
