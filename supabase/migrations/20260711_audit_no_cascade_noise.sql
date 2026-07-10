-- ============================================================================
-- SIPPT — Migration 20260711: hentikan DERAU audit + bersihkan tumpukan lama.
-- Dijalankan di Supabase SQL Editor / `supabase db push`.
--
-- LATAR BELAKANG
--   Tabel audit_logs membengkak jadi ~99,8% isi database (±519.653 baris untuk
--   hanya ~800 baris data nyata). Penyebabnya: trigger rollup pagu (fn_rollup_from)
--   meng-UPDATE `jumlah` SETIAP leluhur + `total_anggaran` usulan setiap satu
--   DETAIL berubah. Semua UPDATE turunan itu ikut dicatat fn_audit_log → 1 edit
--   detail = ~8 baris audit (jauh lebih banyak saat impor). Aplikasi TIDAK PERNAH
--   membaca audit_logs (hanya jejak).
--
-- ISI MIGRASI
--   1) Root-cause: fn_audit_log MENGABAIKAN perubahan yang dipicu trigger lain
--      (pg_trigger_depth() > 1) — mis. rollup pagu & cascade. Aksi LANGSUNG
--      pengguna (depth = 1) tetap tercatat penuh. Trigger tak perlu dibuat ulang;
--      cukup ganti isi fungsinya.
--   2) Kosongkan tumpukan derau lama (TRUNCATE). Aman: tak ada FK yang menunjuk
--      audit_logs, trigger tetap berfungsi (hanya INSERT baris baru), dan aplikasi
--      tak membaca tabel ini → tidak ada fungsi aplikasi yang terganggu.
-- ============================================================================

-- 1) Root-cause: abaikan pencatatan perubahan hasil cascade/trigger lain. ------
--    (Definisi SAMA dengan aslinya — hanya menambah penjaga di baris pertama;
--     atribut security definer & search_path dipertahankan.)
create or replace function fn_audit_log()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid := auth.uid();
  v_old  jsonb;
  v_new  jsonb;
  v_id   text;
begin
  -- Lewati bila perubahan ini DIPICU TRIGGER LAIN (bukan aksi langsung pengguna):
  -- UPDATE `jumlah` leluhur & `total_anggaran` oleh rollup pagu, serta cascade.
  -- Nilai turunan/otomatis seperti itu tak perlu diaudit dan dulu membengkakkan
  -- audit_logs berlipat-lipat.
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old); v_id := old.id::text;
  elsif (tg_op = 'UPDATE') then
    v_old := to_jsonb(old); v_new := to_jsonb(new); v_id := new.id::text;
  else
    v_new := to_jsonb(new); v_id := new.id::text;
  end if;

  insert into audit_logs(user_id, nama_tabel, aksi, row_id, data_lama, data_baru)
  values (v_user, tg_table_name, tg_op::audit_action, v_id, v_old, v_new);

  return coalesce(new, old);
end $$;

-- 2) Bersihkan tumpukan derau yang sudah ada. --------------------------------
--    RESTART IDENTITY mereset urutan bigint id ke awal. Aman: tak ada FK ke
--    audit_logs & aplikasi tak membacanya.
truncate table audit_logs restart identity;
