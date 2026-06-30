-- =====================================================================
-- Cegah duplikasi node struktur (penyebab "data dobel" di dashboard)
--
-- Konteks: dua node struktur (mis. AKUN) dengan induk + level + kode yang
-- sama di dalam satu usulan adalah duplikat yang tidak sah — menyebabkan
-- baris tampil ganda dan pagu terhitung dua kali.
--
-- Jalankan BERTAHAP di Supabase Studio → SQL Editor.
-- =====================================================================

-- LANGKAH 1 — DIAGNOSTIK: lihat dulu duplikat yang ada (TIDAK mengubah data).
-- Hanya level struktural; DETAIL & HEADER boleh berulang sehingga dikecualikan.
select
  usulan_id,
  parent_id,
  level_struktur,
  kode,
  count(*)            as jumlah,
  array_agg(id)       as id_node,
  array_agg(uraian)   as uraian_node
from public.usulan_struktur
where level_struktur in ('PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','AKUN')
  and kode is not null
group by usulan_id, parent_id, level_struktur, kode
having count(*) > 1
order by usulan_id, level_struktur, kode;

-- LANGKAH 2 — (OPSIONAL, HATI-HATI) Bersihkan duplikat LEAF AKUN yang tidak
-- punya anak (paling umum, seperti pada kasus dashboard). Menyisakan satu node
-- per (usulan, induk, level, kode) — yang punya jumlah terbesar lalu tertua.
-- Tinjau hasil LANGKAH 1 sebelum menjalankan. Untuk duplikat yang PUNYA anak
-- (KRO/RO/Komponen), penggabungan perlu pemindahan anak — minta skrip khusus.
--
-- with ranked as (
--   select id,
--          row_number() over (
--            partition by usulan_id, parent_id, level_struktur, kode
--            order by coalesce(jumlah,0) desc, created_at asc, id asc
--          ) as rn
--   from public.usulan_struktur
--   where level_struktur = 'AKUN' and kode is not null
--     and id not in (select distinct parent_id from public.usulan_struktur where parent_id is not null)
-- )
-- delete from public.usulan_struktur s
-- using ranked r
-- where s.id = r.id and r.rn > 1;

-- LANGKAH 3 — PENCEGAHAN: unique index agar duplikat tak bisa dibuat lagi.
-- Hanya berhasil bila tidak ada lagi duplikat (selesaikan LANGKAH 1/2 dahulu).
-- COALESCE pada parent_id agar node akar (parent NULL) tetap terjaga unik.
create unique index if not exists uq_usulan_struktur_sibling_kode
  on public.usulan_struktur (
    usulan_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    level_struktur,
    kode
  )
  where level_struktur in ('PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','AKUN')
    and kode is not null;

-- Segarkan cache skema PostgREST.
notify pgrst, 'reload schema';
