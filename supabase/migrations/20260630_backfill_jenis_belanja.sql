-- =====================================================================
-- Koreksi jenis_belanja (Operasional / Non Operasional) untuk DATA LAMA
--
-- Aturan: HANYA KRO ber-kode '4627.994' yang tergolong Belanja Operasional
-- (OPS); semua KRO lain → Non Operasional (NON_OPS). Jenis belanja diturunkan
-- dari KRO induk setiap node. Hanya node yang memang memakai jenis_belanja
-- (NOT NULL — umumnya level DETAIL) yang diperbarui.
--
-- Jalankan BERTAHAP di Supabase Studio -> SQL Editor.
-- =====================================================================

-- LANGKAH 1 — DIAGNOSTIK: lihat jumlah node per (kode KRO, jenis sekarang).
with recursive tree as (
  select id, kode as kro_kode
  from public.usulan_struktur
  where level = 'KRO'
  union all
  select s.id, t.kro_kode
  from public.usulan_struktur s
  join tree t on s.parent_id = t.id
)
select
  t.kro_kode,
  u.jenis_belanja as jenis_sekarang,
  case when t.kro_kode = '4627.994' then 'OPS' else 'NON_OPS' end as jenis_seharusnya,
  count(*) as jumlah_node
from public.usulan_struktur u
join tree t on t.id = u.id
where u.jenis_belanja is not null
group by t.kro_kode, u.jenis_belanja
order by t.kro_kode;

-- LANGKAH 2 — TERAPKAN: set jenis_belanja sesuai aturan KRO.
-- (Tinjau hasil LANGKAH 1 lebih dulu.)
with recursive tree as (
  select id, kode as kro_kode
  from public.usulan_struktur
  where level = 'KRO'
  union all
  select s.id, t.kro_kode
  from public.usulan_struktur s
  join tree t on s.parent_id = t.id
)
update public.usulan_struktur u
set jenis_belanja = case when t.kro_kode = '4627.994' then 'OPS' else 'NON_OPS' end
from tree t
where u.id = t.id
  and u.jenis_belanja is not null
  and u.jenis_belanja is distinct from
      (case when t.kro_kode = '4627.994' then 'OPS' else 'NON_OPS' end);

-- Catatan:
-- • Total pagu usulan TIDAK berubah; hanya pengelompokan OPS/NON yang dikoreksi
--   sehingga ringkasan di dashboard menjadi akurat.
-- • Jalankan ulang LANGKAH 2 setelah mengimpor Kertas Kerja bila ingin
--   memastikan data impor juga mengikuti aturan ini.
