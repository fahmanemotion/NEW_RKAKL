-- =====================================================================
-- Optimasi performa GET: indeks untuk mempercepat pemuatan struktur usulan
--
-- 1) Fetch pohon (fetchAllStruktur) memakai:
--       WHERE usulan_id = ?  ORDER BY urutan, id
--    Indeks lama (usulan_id, parent_id, urutan) tidak menyajikan urutan ini,
--    sehingga Postgres menyortir manual tiap kali usulan dibuka. Indeks
--    (usulan_id, urutan, id) membuat baris terbaca SUDAH terurut → membuka
--    usulan (terutama yang besar) jauh lebih cepat.
--
-- 2) addNode / cek duplikat / nextUrutan memfilter (usulan_id, level).
--
-- Aman & idempoten. Jalankan di Supabase Studio -> SQL Editor.
-- (Untuk tabel sangat besar di produksi, bisa pakai CREATE INDEX CONCURRENTLY
--  di luar transaksi agar tidak mengunci tulis; untuk data biasa perintah di
--  bawah sudah cukup.)
-- =====================================================================

create index if not exists idx_struktur_usulan_urutan_id
  on public.usulan_struktur (usulan_id, urutan, id);

create index if not exists idx_struktur_usulan_level
  on public.usulan_struktur (usulan_id, level);

-- Segarkan statistik perencana kueri agar indeks baru langsung dimanfaatkan.
analyze public.usulan_struktur;

notify pgrst, 'reload schema';
