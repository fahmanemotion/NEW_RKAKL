# SIPPT — Panduan Utama

Sistem Penyusunan & Penelaahan Pagu/RUH (ala SAKTI) untuk PIP Makassar.
**Seluruh berkas aplikasi ada di dalam folder ini** — pindahkan/copy folder ini
sebagai satu kesatuan, semua ikut (kode, SQL database, template Excel, dokumentasi).

---

## 1. Isi folder

- `src/` — kode aplikasi (Next.js 15 + TypeScript)
- `supabase/` — semua skrip database:
  - `migrations/0001_init.sql` … `0006_detail_jenis_belanja.sql` — struktur, fungsi, trigger, RLS, level
  - `seed.sql` — data awal (role, BA 022, satker PIP Makassar, dll.)
  - `0004_import_referensi_kemenhub.sql` — impor referensi kode Kemenhub
  - `PERBAIKAN_jenis_belanja.sql` — perbaikan cepat bila kolom jenis_belanja belum ada
- `Template_Referensi_SIPPT.xlsx` — template Excel untuk Import referensi (7 sheet master)
- `test_*.mjs` — unit test (jalankan dengan `npm test`)
- `.env.example` — contoh konfigurasi (salin menjadi `.env.local`, isi kunci Supabase)
- `QUICKSTART.md`, `README.md` — dokumentasi rinci

---

## 2. Memindahkan folder (mis. dari Downloads ke Documents)

Selalu mulai dari home; jangan memindahkan folder saat Terminal ada di dalamnya.

```bash
cd ~
mv ~/Downloads/sippt ~/Documents/sippt   # pindahkan sekaligus
cd ~/Documents/sippt
```

Bila berupa ZIP, ekstrak langsung ke tujuan:
```bash
cd ~
unzip -o ~/Downloads/sippt.zip -d ~/Documents/sippt
cd ~/Documents/sippt
```

---

## 3. Menjalankan aplikasi

```bash
cd ~/Documents/sippt
npm install        # sekali, atau setelah pindah/ekstrak baru
npm run dev        # buka http://localhost:3000
```

Konfigurasi (sekali): salin `.env.example` menjadi `.env.local`, lalu isi
`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari dashboard Supabase
(Settings → API).

---

## 4. Menyiapkan database (Supabase → SQL Editor, jalankan berurutan)

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_functions_triggers.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/seed.sql`
5. `supabase/0004_import_referensi_kemenhub.sql`
6. `supabase/migrations/0005_program_kegiatan_levels.sql`  (dua perintah ALTER TYPE)
7. `supabase/migrations/0006_detail_jenis_belanja.sql`

Jika muncul error *"Could not find the 'jenis_belanja' column"*, jalankan
`supabase/PERBAIKAN_jenis_belanja.sql`.

Buat user di Supabase (Authentication), lalu set profilnya jadi Administrator &
satker 287494 (lihat QUICKSTART.md untuk SQL-nya).

---

## 5. Menjalankan unit test

```bash
cd ~/Documents/sippt
npm test
```

Menjalankan seluruh test logika (pohon, toolbar, referensi, detail) — berguna untuk
memastikan tidak ada yang rusak setelah perubahan.

---

## Catatan pemindahan
- `.env.local` (kunci Supabase) ikut terbawa saat memindahkan folder dengan `mv`.
  Jika Anda mengganti folder dengan ekstrak ZIP baru, buat ulang `.env.local`.
- Setiap kali mengekstrak ZIP baru, lakukan dari `cd ~` dulu — jangan saat Terminal
  berada di dalam folder tujuan (mencegah error `EPERM/uv_cwd`).
