-- ============================================================================
-- SIPPT — Template ISI TOR yang DAPAT DIPAKAI ULANG lintas usulan/tahun.
-- Dijalankan di Supabase SQL Editor / `supabase db push`.
--
-- LATAR: narasi TOR (tor_narasi/tor_tahapan/tor_komponen_opsi) tersimpan per
-- (usulan_id, komponen_id). komponen_id = usulan_struktur.id yang UNIK per
-- usulan → saat pindah usulan (PAGU/tahun berikutnya) narasi tak terbawa.
--
-- SOLUSI: simpan isi TOR ber-KUNCI NAMA KOMPONEN yang dinormalisasi (sama
-- seperti pencocokan KODE TOR), sehingga bisa dimuat ulang untuk usulan lain
-- yang komponennya bernama sama. (KODE TOR sendiri sudah reusable — ia master.)
-- ============================================================================

create table if not exists public.tor_isi_template (
  komponen_key  text primary key,                    -- nama komponen dinormalisasi (normKomp)
  komponen_nama text not null,                        -- nama asli komponen (untuk tampilan)
  data          jsonb not null default '{}'::jsonb,   -- { narasi:{sec:teks}, tahapan:[...], sumberDana }
  updated_at    timestamptz not null default now()
);

alter table public.tor_isi_template enable row level security;

-- Template dipakai bersama (di-kunci nama komponen, bukan per usulan): baca &
-- tulis untuk semua user login. Data ANGGARAN tetap dijaga oleh RLS masing-masing.
drop policy if exists p_tor_tmpl_all on public.tor_isi_template;
create policy p_tor_tmpl_all on public.tor_isi_template for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';
