-- =====================================================================
-- GABUNG & HAPUS duplikat master_program (kode sama, mis. "12.DL")
-- Versi MERGE: aman walau baris duplikat sudah PUNYA anak / dipakai usulan.
--
-- Strategi: untuk tiap kode_program, tetapkan 1 baris "keeper" (paling banyak
-- kegiatan). Semua referensi dari baris duplikat dipindahkan ke keeper, lalu
-- baris duplikat dihapus. Terakhir kode_program dijadikan UNIK agar tak terulang.
--
-- Jalankan SELURUH blok ini sekaligus di Supabase Studio -> SQL Editor.
-- (Memakai tabel sementara; aman, tidak menyentuh data selain pemindahan ini.)
-- =====================================================================

begin;

-- 0) Bersihkan tabel bantu bila ada sisa run sebelumnya.
drop table if exists prog_keep;
drop table if exists prog_dup;

-- 1) Tetapkan keeper per kode_program (prioritas: paling banyak kegiatan, lalu id).
create temp table prog_keep on commit drop as
select kode_program,
       (array_agg(id order by keg_cnt desc, id))[1] as keeper_id
from (
  select p.id, p.kode_program,
         (select count(*) from master_kegiatan k where k.program_id = p.id) as keg_cnt
  from master_program p
) t
group by kode_program;

-- 2) Daftar baris duplikat (selain keeper) + tujuan keeper-nya.
create temp table prog_dup on commit drop as
select p.id as dup_id, pk.keeper_id
from master_program p
join prog_keep pk on pk.kode_program = p.kode_program
where p.id <> pk.keeper_id;

-- 3) Pindahkan referensi yang TANPA batasan unik (aman).
update usulan_anggaran u set program_id  = d.keeper_id from prog_dup d where u.program_id  = d.dup_id;
update usulan_struktur s set referensi_id = d.keeper_id from prog_dup d where s.referensi_id = d.dup_id;

-- 4) Pindahkan kegiatan milik duplikat yang kode_kegiatan-nya BELUM ada di keeper
--    (hindari bentrok unique (program_id, kode_kegiatan)).
update master_kegiatan k set program_id = d.keeper_id
from prog_dup d
where k.program_id = d.dup_id
  and not exists (
    select 1 from master_kegiatan k2
    where k2.program_id = d.keeper_id and k2.kode_kegiatan = k.kode_kegiatan
  );

-- 5) Hapus baris program duplikat yang sudah tidak punya kegiatan tersisa.
delete from master_program p
using prog_dup d
where p.id = d.dup_id
  and not exists (select 1 from master_kegiatan k where k.program_id = p.id);

commit;

-- 6) Cegah terulang: kode_program UNIK GLOBAL (membuat upsert importer idempoten).
create unique index if not exists uq_master_program_kode
  on public.master_program (kode_program);

notify pgrst, 'reload schema';

-- =====================================================================
-- VERIFIKASI: pastikan tidak ada lagi kode_program ganda.
select kode_program, count(*) as jumlah
from master_program
group by kode_program
having count(*) > 1;
-- (Hasil kosong = bersih. Jika langkah 6 gagal "duplicate key", berarti masih
--  ada duplikat yang kegiatannya BENTROK kode — kirimkan hasil query verifikasi
--  ini agar dibuatkan penggabungan tingkat kegiatan yang aman.)
-- =====================================================================
