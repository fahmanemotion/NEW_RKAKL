-- SIPPT — Import referensi kode RKA-KL Kemenhub (BA 022) dari Excel.
-- Idempotent: aman dijalankan berulang (ON CONFLICT DO NOTHING).
-- Jalankan SETELAH 0001-0003 + seed.sql.

create temp table _ref_import (
  ba text, kode_program text, nama_program text,
  kode_kegiatan text, nama_kegiatan text,
  kode_kro text, nama_kro text,
  kode_ro text, nama_ro text,
  kode_komponen text, nama_komponen text
) on commit drop;

insert into _ref_import values
('022','12.WA','Program Dukungan Manajemen','4626','Pengelolaan Organisasi dan SDM Transportasi','EBC','Layanan Manajemen SDM Internal','954','Layanan Manajemen SDM','051','Layanan Kepegawaian'),
('022','12.WA','Program Dukungan Manajemen','4627','Pengelolaan Perencanaan, Keuangan, BMN, dan Umum SDM Transportasi','EBA','Layanan Dukungan Manajemen Internal','962','Layanan Umum','052','Pelayanan umum dan perlengkapan'),
('022','12.WA','Program Dukungan Manajemen','4627','Pengelolaan Perencanaan, Keuangan, BMN, dan Umum SDM Transportasi','EBA','Layanan Dukungan Manajemen Internal','994','Layanan Perkantoran','001','Gaji dan Tunjangan'),
('022','12.WA','Program Dukungan Manajemen','4627','Pengelolaan Perencanaan, Keuangan, BMN, dan Umum SDM Transportasi','EBA','Layanan Dukungan Manajemen Internal','994','Layanan Perkantoran','002','Operasional dan Pemeliharaan Kantor'),
('022','12.WA','Program Dukungan Manajemen','4627','Pengelolaan Perencanaan, Keuangan, BMN, dan Umum SDM Transportasi','EBD','Layanan Manajemen Kinerja Interna','953','Layanan Pemantauan dan Evaluasi','051','Layanan Pemantauan dan Evaluasi'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','1975','Pengembangan Sumber Daya Manusia Transportasi','DAB','Pendidikan Vokasi Bidang Infrastruktur','002','Diklat Pembentukan Reguler (Pola Pembibitan Transportasi Laut)','051','Diploma IV Nautika/Teknologi Rekayasa Operasi Kapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','1975','Pengembangan Sumber Daya Manusia Transportasi','DAB','Pendidikan Vokasi Bidang Infrastruktur','002','Diklat Pembentukan Reguler (Pola Pembibitan Transportasi Laut)','052','Diploma IV Teknika/Teknologi Rekayasa PermesinanKapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','1975','Pengembangan Sumber Daya Manusia Transportasi','DAB','Pendidikan Vokasi Bidang Infrastruktur','002','Diklat Pembentukan Reguler (Pola Pembibitan Transportasi Laut)','054','Diploma IV Manajemen Pelabuhan dan Logistik Maritim/KALK'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','1975','Pengembangan Sumber Daya Manusia Transportasi','DAB','Pendidikan Vokasi Bidang Infrastruktur','002','Diklat Pembentukan Reguler (Pola Pembibitan Transportasi Laut)','601','Dukungan Penyelenggaraan Diklat'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','1975','Pengembangan Sumber Daya Manusia Transportasi','DCB','Pelatihan Bidang Infrastruktur','003','Tenaga Pendidik Bidang Transportasi Laut yang Kompeten','051','Tenaga Pendidik yang Kompeten'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','AEC','Kerja sama','002','Kerjasama dan Kemitraan Antar Instansi dan Lembaga Transportasi Laut','051','Kerjasama Antar Instansi Pemerintah/Swasta/Lembaga Terkait'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','AFA','Norma, Standard, Prosedur dan Kriteria','002','Modul dan bahan ajar Berbasis Kompetensi Transportasi Laut','051','Workshop Silabus Program Studi'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','AFA','Norma, Standard, Prosedur dan Kriteria','002','Modul dan bahan ajar Berbasis Kompetensi Transportasi Laut','052','Review Modul dan Bahan Ajar'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','BMA','Data dan Informasi Publik','002','Data Peserta dan Penyerapan Lulusan Diklat Transportasi Laut','051','Penyusunan Laporan Tracer Study'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','BMA','Data dan Informasi Publik','005','Dokumen Hasil Evaluasi Pasca Diklat Transportasi Laut','051','Pelaksanaan Survey'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','BMA','Data dan Informasi Publik','005','Dokumen Hasil Evaluasi Pasca Diklat Transportasi Laut','052','Penyusunan Laporan Indeks Kepuasan'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','BMA','Data dan Informasi Publik','008','Sistem Data Informasi Penunjang Diklat Transportasi Laut','053','Update Sistem Lainnya'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','CCA','OP Sarana Bidang Pendidikan','002','OP Sarana Bidang Pendidikan Transportasi Laut','054','Sarana Penunjang Diklat Lainnya'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','CDJ','OP Prasarana Bidang Pendidikan Tinggi','002','OP Prasarana Bidang Pendidikan Tinggi Transportasi Laut','051','Prasarana Diklat'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','051','Diklat Pelaut - I (DP-I) Nautika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','052','Diklat Pelaut - II (DP-II) Nautika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','053','Diklat Pelaut - III (DP-III) Nautika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','054','Diklat Pelaut - IV (DP-IV) Nautika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','055','Diklat Pelaut - V (DP-V) Nautika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','056','Diklat Pelaut - I (DP-I) Teknik'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','057','Diklat Pelaut - II (DP-II) Teknika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','058','Diklat Pelaut - III (DP-III) Teknika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','059','Diklat Pelaut - IV (DP-IV) Teknika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','002','Diklat Peningkatan Kompetensi Penjenjangan Transportasi Laut','060','Diklat Pelaut - V (DP-V) Teknika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','051','Diklat Pelaut Pemutakhiran Ahli Nautika Tingkat - I (DP Pemutakhiran ANT - I)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','052','Diklat Pelaut Pemutakhiran Ahli Nautika Tingkat - II (DP Pemutakhiran ANT - II)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','053','Diklat Pelaut Pemutakhiran Ahli Nautika Tingkat - III (DP Pemutakhiran ANT - III)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','056','Diklat Pelaut Pemutakhiran Ahli Teknika Tingkat - I (DP Pemutakhiran ATT - I)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','057','Diklat Pelaut Pemutakhiran Ahli Teknika Tingkat - II (DP Pemutakhiran ATT - II)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','058','Diklat Pelaut Pemutakhiran Ahli Teknika Tingkat - III (DP Pemutakhiran ATT - III)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','065','Diklat Pelaut Pemutakhiran Ahli Nautika Tingkat - III Manajemen (DP Pemutakhiran ANT-III Manajemen)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','066','Diklat Pelaut Pemutakhiran Ahli Nautika Tingkat - IV Manajemen (DP Pemutakhiran ANT-IV Manajemen)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','068','Diklat Pelaut Pemutakhiran Ahli Teknika Tingkat - III Manajemen (DP Pemutakhiran ATT-III Manajemen)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','005','Diklat Peningkatan Kompetensi Pemutakhiran Transportasi Laut','069','Diklat Pelaut Pemutakhiran Ahli Teknika Tingkat - IV Manajemen (DP Pemutakhiran ATT-IV Manajemen)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','011','Diklat Teknis Bidang Transportasi Laut','051','Basic Safety Training (BST)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','011','Diklat Teknis Bidang Transportasi Laut','052','Basic Training For Liquefied Gas Tanker Cargo Operations (BTLGTCO)'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','011','Diklat Teknis Bidang Transportasi Laut','501','Diklat Kerjasama'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','011','Diklat Teknis Bidang Transportasi Laut','051','Dukungan Penyelenggaraan Diklat'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','018','Tenaga Pendidik Bidang Transportasi Laut yang Kompeten','051','Tenaga Pendidik yang Kompeten'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','018','Tenaga Pendidik Bidang Transportasi Laut yang Kompeten','052','Pengabdian Masyarakat'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','DCB','Pelatihan Bidang Infrastruktur','018','Tenaga Pendidik Bidang Transportasi Laut yang Kompeten','055','Penelitian Ilmiah'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','004','Diklat Pembentukan Reguler (non Pola Pembibitan) Transportasi Laut (Prioritas Nasional)','051','Diploma IV Nautika/Teknologi Rekayasa Operasi Kapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','004','Diklat Pembentukan Reguler (non Pola Pembibitan) Transportasi Laut (Prioritas Nasional)','052','Diploma IV Teknika/Teknologi Rekayasa Permesinan Kapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','004','Diklat Pembentukan Reguler (non Pola Pembibitan) Transportasi Laut (Prioritas Nasional)','601','Dukungan Penyelenggaraan Diklat'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','005','Diklat Pembentukan Non Reguler (mandiri) TransportasiLaut (Prioritas Nasional)','051','Diploma IV Nautika/Teknologi Rekayasa Operasi Kapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','005','Diklat Pembentukan Non Reguler (mandiri) TransportasiLaut (Prioritas Nasional)','052','Diploma IV Teknika/Teknologi Rekayasa PermesinanKapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','005','Diklat Pembentukan Non Reguler (mandiri) TransportasiLaut (Prioritas Nasional)','054','Diploma IV Manajemen Pelabuhan dan Logistik Maritim Kapal'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','005','Diklat Pembentukan Non Reguler (mandiri) TransportasiLaut (Prioritas Nasional)','064','Diklat Pelaut - III (DP-III) Pembentukan Nautika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','005','Diklat Pembentukan Non Reguler (mandiri) TransportasiLaut (Prioritas Nasional)','065','Diklat Pelaut - III (DP-III) Pembentukan Teknika'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SAB','Pendidikan Vokasi Bidang Infrastruktur','005','Diklat Pembentukan Non Reguler (mandiri) TransportasiLaut (Prioritas Nasional)','601','Dukungan Penyelenggaraan Diklat'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SCB','Pelatihan Bidang Infrastruktur','005','Diklat Pemberdayaan Masyarakat bidang Transportasi Laut (Prioritas Nasional)','055','Basic Safety Training (BST) Kapal Layar Motor'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SCB','Pelatihan Bidang Infrastruktur','005','Diklat Pemberdayaan Masyarakat bidang Transportasi Laut (Prioritas Nasional)','058','Diklat Kecakapan Kapal Tradisonal Penangkap Ikan Dengan Pelayaran Maksimal 60 Mil Bagian Dek'),
('022','12.DL','Program Pendidikan dan Pelatihan Vokasi','3996','Pendidikan Transportasi','SCB','Pelatihan Bidang Infrastruktur','005','Diklat Pemberdayaan Masyarakat bidang Transportasi Laut (Prioritas Nasional)','059','Diklat Kecakapan Kapal Tradisonal Penangkap Ikan Dengan Pelayaran Maksimal 60 Mil Bagian Mesin');

insert into master_ba (kode_ba, nama_ba)
values ('022','Kementerian Perhubungan') on conflict (kode_ba) do nothing;

insert into master_program (ba_id, kode_program, nama_program)
select b.id, i.kode_program, min(i.nama_program)
from _ref_import i join master_ba b on b.kode_ba = i.ba
group by b.id, i.kode_program
on conflict (ba_id, kode_program) do nothing;

insert into master_kegiatan (program_id, kode_kegiatan, nama_kegiatan)
select p.id, i.kode_kegiatan, min(i.nama_kegiatan)
from _ref_import i
join master_ba b on b.kode_ba = i.ba
join master_program p on p.ba_id = b.id and p.kode_program = i.kode_program
group by p.id, i.kode_kegiatan
on conflict (program_id, kode_kegiatan) do nothing;

insert into master_kro (kegiatan_id, kode_kro, nama_kro)
select k.id, i.kode_kro, min(i.nama_kro)
from _ref_import i
join master_ba b on b.kode_ba = i.ba
join master_program p on p.ba_id = b.id and p.kode_program = i.kode_program
join master_kegiatan k on k.program_id = p.id and k.kode_kegiatan = i.kode_kegiatan
group by k.id, i.kode_kro
on conflict (kegiatan_id, kode_kro) do nothing;

insert into master_ro (kro_id, kode_ro, nama_ro)
select kr.id, i.kode_ro, min(i.nama_ro)
from _ref_import i
join master_ba b on b.kode_ba = i.ba
join master_program p on p.ba_id = b.id and p.kode_program = i.kode_program
join master_kegiatan k on k.program_id = p.id and k.kode_kegiatan = i.kode_kegiatan
join master_kro kr on kr.kegiatan_id = k.id and kr.kode_kro = i.kode_kro
group by kr.id, i.kode_ro
on conflict (kro_id, kode_ro) do nothing;

insert into master_komponen (ro_id, kode_komponen, nama_komponen, jenis)
select ro.id, i.kode_komponen, min(i.nama_komponen),
       case when left(i.kode_komponen,1) in ('5','6') then 'Pendukung' else 'Utama' end
from _ref_import i
join master_ba b on b.kode_ba = i.ba
join master_program p on p.ba_id = b.id and p.kode_program = i.kode_program
join master_kegiatan k on k.program_id = p.id and k.kode_kegiatan = i.kode_kegiatan
join master_kro kr on kr.kegiatan_id = k.id and kr.kode_kro = i.kode_kro
join master_ro ro on ro.kro_id = kr.id and ro.kode_ro = i.kode_ro
group by ro.id, i.kode_komponen
on conflict (ro_id, kode_komponen) do nothing;
