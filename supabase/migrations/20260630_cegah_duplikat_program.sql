-- =====================================================================
-- Perbaikan & PENCEGAHAN duplikat master_program (kode sama, mis. "12.DL")
--
-- PENYEBAB:
--   Importer KODE memakai onConflict "kode_program" (intent: unik GLOBAL),
--   tetapi constraint DB hanya unique (ba_id, kode_program). Akibatnya kode
--   program yang sama bisa tersimpan dua kali (mis. beda BA / beda nama),
--   lalu keduanya muncul di modal "Pilih Program".
--   CATATAN: Impor Kertas Kerja TIDAK menulis ke master_program, jadi BUKAN
--   penyebab duplikat ini.
--
-- Jalankan BERTAHAP di Supabase Studio -> SQL Editor (tinjau tiap langkah).
-- =====================================================================

-- ── LANGKAH 1 — DIAGNOSTIK (tidak mengubah data) ─────────────────────
-- Lihat semua kode_program yang dobel beserta keterpakaiannya. Baris yang
-- "jml_kegiatan / dipakai_usulan / dipakai_struktur" = 0 adalah duplikat liar
-- yang aman dihapus.
select
  p.kode_program,
  p.id,
  p.ba_id,
  p.nama_program,
  (select count(*) from master_kegiatan k where k.program_id   = p.id) as jml_kegiatan,
  (select count(*) from usulan_anggaran u where u.program_id    = p.id) as dipakai_usulan,
  (select count(*) from usulan_struktur s where s.referensi_id  = p.id) as dipakai_struktur
from master_program p
where p.kode_program in (
  select kode_program from master_program group by kode_program having count(*) > 1
)
order by p.kode_program, jml_kegiatan desc, p.id;

-- ── LANGKAH 2 — BERSIHKAN duplikat yang AMAN ─────────────────────────
-- Untuk tiap kode_program, SISAKAN baris terbaik (paling banyak kegiatan),
-- lalu hapus duplikat lain HANYA bila tidak punya kegiatan DAN tidak dipakai
-- usulan (anggaran/struktur). Duplikat yang masih punya anak SENGAJA dibiarkan
-- agar tidak merusak data — tinjau manual (lihat catatan di bawah).
with ranked as (
  select
    p.id,
    p.kode_program,
    (select count(*) from master_kegiatan k where k.program_id  = p.id) as keg_cnt,
    (select count(*) from usulan_anggaran u where u.program_id   = p.id) as ua_cnt,
    (select count(*) from usulan_struktur s where s.referensi_id = p.id) as us_cnt,
    row_number() over (
      partition by p.kode_program
      order by (select count(*) from master_kegiatan k where k.program_id = p.id) desc, p.id
    ) as rn
  from master_program p
)
delete from master_program p
using ranked r
where p.id = r.id
  and r.rn > 1          -- bukan baris terbaik yang dipertahankan
  and r.keg_cnt = 0     -- tanpa kegiatan
  and r.ua_cnt  = 0     -- tak dipakai usulan_anggaran
  and r.us_cnt  = 0;    -- tak dipakai usulan_struktur

-- ── LANGKAH 3 — CEGAH terulang ───────────────────────────────────────
-- Jadikan kode_program UNIK GLOBAL (sesuai cara aplikasi memetakan program
-- yang memang global). Ini juga membuat upsert importer KODE (onConflict
-- kode_program) menjadi idempoten sehingga tidak pernah lagi membuat duplikat.
-- Index hanya berhasil dibuat bila TIDAK ADA lagi duplikat (selesaikan 1 & 2).
create unique index if not exists uq_master_program_kode
  on public.master_program (kode_program);

notify pgrst, 'reload schema';

-- =====================================================================
-- CATATAN PENANGANAN:
-- • Jika LANGKAH 3 GAGAL dengan "could not create unique index ... duplicate
--   key", berarti masih ada duplikat yang PUNYA anak/dipakai usulan. Jalankan
--   LANGKAH 1 lagi untuk melihatnya. Penggabungan baris seperti itu perlu
--   pemindahan anak (master_kegiatan.program_id, usulan_anggaran.program_id,
--   usulan_struktur.referensi_id) ke baris yang dipertahankan sebelum dihapus
--   — minta skrip penggabungan khusus agar aman.
-- • Setelah index ada, percobaan menambah program berkode sama (lewat importer
--   maupun menu Referensi) akan otomatis ter-update / ditolak, bukan menambah
--   baris baru.
-- =====================================================================
