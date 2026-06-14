-- ============================================================================
-- SIPPT — Seed data awal (Politeknik Ilmu Pelayaran Makassar)
-- Jalankan setelah 0001–0003. Idempotent (on conflict do nothing).
-- ============================================================================

-- ── Roles ───────────────────────────────────────────────────────────────────
insert into roles (nama, deskripsi) values
  ('Administrator','Akses penuh seluruh modul'),
  ('Operator','Dashboard & Penganggaran (satker sendiri)'),
  ('Reviewer','Dashboard & Review Anggaran'),
  ('Pimpinan','Dashboard, Monitoring & Laporan (read-only)')
on conflict (nama) do nothing;

-- ── Permissions (matriks hak akses per modul) ───────────────────────────────
insert into permissions (role_id, module_name, can_create, can_read, can_update, can_delete)
select r.id, m.module_name, m.can_create, m.can_read, m.can_update, m.can_delete
from (values
  ('Administrator','Dashboard',     true,true,true,true),
  ('Administrator','Penganggaran',  true,true,true,true),
  ('Administrator','Review',        true,true,true,true),
  ('Administrator','Monitoring',    true,true,true,true),
  ('Administrator','Referensi',     true,true,true,true),
  ('Administrator','Pengguna',      true,true,true,true),
  ('Administrator','Laporan',       true,true,true,true),
  ('Operator','Dashboard',          false,true,false,false),
  ('Operator','Penganggaran',       true,true,true,true),
  ('Reviewer','Dashboard',          false,true,false,false),
  ('Reviewer','Review',             false,true,true,false),
  ('Pimpinan','Dashboard',          false,true,false,false),
  ('Pimpinan','Monitoring',         false,true,false,false),
  ('Pimpinan','Laporan',            false,true,false,false)
) as m(role_name, module_name, can_create, can_read, can_update, can_delete)
join roles r on r.nama = m.role_name
on conflict (role_id, module_name) do nothing;

-- ── BA / Kementerian / Unit / Satker ────────────────────────────────────────
insert into master_ba (kode_ba, nama_ba)
values ('022','Kementerian Perhubungan')
on conflict (kode_ba) do nothing;

insert into master_kementerian (ba_id, kode, nama)
select id, '022', 'Kementerian Perhubungan' from master_ba where kode_ba='022'
on conflict do nothing;

insert into master_unit_eselon1 (kementerian_id, kode, nama)
select k.id, '12', 'Badan Pengembangan SDM Perhubungan'
from master_kementerian k where k.kode='022'
on conflict do nothing;

insert into master_satker (unit_id, kode_satker, nama_satker, kppn, lokus)
select u.id, '287494', 'Politeknik Ilmu Pelayaran Makassar', '054', '19.51-KOTA MAKASSAR'
from master_unit_eselon1 u where u.kode='12'
on conflict (kode_satker) do nothing;

-- ── Program → Kegiatan → KRO → RO ───────────────────────────────────────────
insert into master_program (ba_id, kode_program, nama_program)
select id, '12.DL', 'Pendidikan dan Pelatihan Vokasi' from master_ba where kode_ba='022'
on conflict do nothing;

insert into master_kegiatan (program_id, kode_kegiatan, nama_kegiatan)
select p.id, '3996', 'Pendidikan Transportasi' from master_program p where p.kode_program='12.DL'
on conflict do nothing;

insert into master_kro (kegiatan_id, kode_kro, nama_kro, satuan)
select k.id, 'SAB', 'Pendidikan Vokasi Bidang Infrastruktur', 'Orang'
from master_kegiatan k where k.kode_kegiatan='3996'
on conflict do nothing;

insert into master_ro (kro_id, kode_ro, nama_ro, satuan)
select kr.id, '004', 'Diklat Pembentukan Reguler (non Pola Pembibitan) Transportasi Laut (Prioritas Nasional)', 'Orang'
from master_kro kr where kr.kode_kro='SAB'
on conflict do nothing;

-- ── Akun contoh ─────────────────────────────────────────────────────────────
insert into master_akun (kode_akun, nama_akun, kategori_belanja, sumber_dana) values
  ('521111','Belanja Keperluan Perkantoran','Belanja Barang','RM'),
  ('521211','Belanja Bahan','Belanja Barang','RM'),
  ('521213','Belanja Honor Output Kegiatan','Belanja Barang','RM'),
  ('525111','Belanja Gaji dan Tunjangan (BLU)','Belanja Pegawai','BLU'),
  ('525112','Belanja Barang (BLU)','Belanja Barang','BLU'),
  ('525113','Belanja Jasa (BLU)','Belanja Barang','BLU'),
  ('525114','Belanja Pemeliharaan (BLU)','Belanja Barang','BLU'),
  ('525115','Belanja Perjalanan (BLU)','Belanja Barang','BLU')
on conflict (kode_akun) do nothing;
