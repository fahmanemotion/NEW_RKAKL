-- Mempercepat cek "apakah kode master sudah dipakai?" saat menghapus KODE KK.
-- usulan_struktur.referensi_id merujuk id master (tanpa FK), sering di-query
-- dengan WHERE referensi_id = ? / IN (...). Indeks parsial (abaikan NULL).
create index if not exists idx_struktur_referensi_id
  on public.usulan_struktur (referensi_id)
  where referensi_id is not null;

analyze public.usulan_struktur;
