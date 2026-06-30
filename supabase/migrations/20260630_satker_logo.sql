-- =====================================================================
-- Logo satker
-- Menyimpan logo satker sebagai data URL (gambar diperkecil di sisi klien)
-- pada kolom teks. Logo tampil di pojok kiri atas (topnav) aplikasi.
--
-- Aman dijalankan berulang (idempoten). Jalankan di Supabase Studio -> SQL Editor.
-- =====================================================================

alter table public.master_satker
  add column if not exists logo text;

-- Segarkan cache skema PostgREST agar kolom langsung dikenali API.
notify pgrst, 'reload schema';

-- Catatan:
-- • Tidak perlu Storage/bucket; logo disimpan langsung sebagai data URL (base64)
--   yang sudah diperkecil (maks 256px) sehingga ukurannya kecil.
-- • Policy UPDATE master_satker yang sudah ada (dipakai saat mengubah identitas
--   satker) otomatis mencakup kolom ini — tidak perlu policy baru.
