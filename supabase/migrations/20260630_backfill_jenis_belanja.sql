-- =====================================================================
-- Koreksi jenis_belanja (Operasional / Non Operasional) untuk DATA LAMA
--
-- Aturan: Belanja Operasional = output "Layanan Perkantoran" (kode RO berakhiran
-- '.994', mis. 4627.EBA.994) BESERTA SELURUH turunannya (komponen 001 Gaji &
-- 002 Operasional Kantor, akun, hingga detail). Semua output lain → Non
-- Operasional. Hanya node yang memang memakai jenis_belanja (NOT NULL — umumnya
-- level DETAIL) yang diperbarui.
--
-- Jalankan BERTAHAP di Supabase Studio -> SQL Editor.
-- =====================================================================

-- LANGKAH 1 — DIAGNOSTIK: lihat sebaran sebelum & sesudah.
with recursive ops_tree as (
  select id from public.usulan_struktur where kode like '%.994'
  union all
  select s.id
  from public.usulan_struktur s
  join ops_tree o on s.parent_id = o.id
)
select
  case when u.id in (select id from ops_tree) then 'OPS' else 'NON_OPS' end as jenis_seharusnya,
  u.jenis_belanja as jenis_sekarang,
  count(*) as jumlah_node
from public.usulan_struktur u
where u.jenis_belanja is not null
group by 1, 2
order by 1, 2;

-- LANGKAH 2 — TERAPKAN: set OPS untuk subtree Layanan Perkantoran, sisanya NON_OPS.
-- (Tinjau LANGKAH 1 lebih dulu.)
with recursive ops_tree as (
  select id from public.usulan_struktur where kode like '%.994'
  union all
  select s.id
  from public.usulan_struktur s
  join ops_tree o on s.parent_id = o.id
)
update public.usulan_struktur u
set jenis_belanja = case when u.id in (select id from ops_tree) then 'OPS' else 'NON_OPS' end
where u.jenis_belanja is not null
  and u.jenis_belanja is distinct from
      (case when u.id in (select id from ops_tree) then 'OPS' else 'NON_OPS' end);

-- Catatan:
-- • Total pagu TIDAK berubah; hanya pengelompokan OPS/NON yang dikoreksi.
-- • '%.994' mencocokkan kode RO yang berakhiran .994 (Layanan Perkantoran).
--   Jika di data Anda kode outputnya berbeda, sesuaikan polanya.
