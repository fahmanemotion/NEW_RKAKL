-- ============================================================================
-- SIPPT — Migration 0005: dukung Program & Kegiatan sebagai node di pohon usulan
-- (satu usulan kini bisa memuat banyak Program/Kegiatan).
-- ============================================================================

-- 1) Tambah nilai enum level_struktur. Jalankan bagian ini DULU & terpisah
--    (ALTER TYPE ADD VALUE tidak boleh dipakai di transaksi yang sama dengan
--     pemakaian nilainya). Di Supabase SQL Editor, jalankan dua perintah ini,
--     baru kemudian (opsional) bagian upgrade data di bawah.
alter type level_struktur add value if not exists 'PROGRAM' before 'KRO';
alter type level_struktur add value if not exists 'KEGIATAN' before 'KRO';

-- ----------------------------------------------------------------------------
-- 2) (OPSIONAL) Upgrade usulan LAMA agar Program/Kegiatan menjadi node nyata.
--    Untuk tiap usulan yang punya program_id/kegiatan_id tetapi belum punya
--    node PROGRAM, buat node PROGRAM + KEGIATAN, lalu pindahkan KRO yang masih
--    di akar (parent_id null) ke bawah node KEGIATAN.
--    >>> Jalankan blok ini SETELAH dua ALTER TYPE di atas ter-commit. <<<
/*
do $$
declare u record; prog_id uuid; keg_id uuid; kode_ba text;
begin
  select kode_ba into kode_ba from master_ba limit 1;
  for u in
    select ua.id, ua.program_id, ua.kegiatan_id,
           p.kode_program, p.nama_program, k.kode_kegiatan, k.nama_kegiatan
    from usulan_anggaran ua
    left join master_program p on p.id = ua.program_id
    left join master_kegiatan k on k.id = ua.kegiatan_id
    where ua.program_id is not null and ua.kegiatan_id is not null
      and not exists (select 1 from usulan_struktur s where s.usulan_id = ua.id and s.level = 'PROGRAM')
  loop
    insert into usulan_struktur (usulan_id, parent_id, level, referensi_id, kode, uraian, urutan)
      values (u.id, null, 'PROGRAM', u.program_id, coalesce(kode_ba,'022')||'.'||u.kode_program, u.nama_program, 0)
      returning id into prog_id;
    insert into usulan_struktur (usulan_id, parent_id, level, referensi_id, kode, uraian, urutan)
      values (u.id, prog_id, 'KEGIATAN', u.kegiatan_id, u.kode_kegiatan, u.nama_kegiatan, 0)
      returning id into keg_id;
    update usulan_struktur set parent_id = keg_id
      where usulan_id = u.id and level = 'KRO' and parent_id is null;
  end loop;
end $$;
*/
