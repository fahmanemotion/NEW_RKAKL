# SIPPT — QUICKSTART (dari nol sampai jalan)

## 0. Prasyarat
- **Node.js 20 LTS** (minimal 18.18). Cek: `node -v`.
- Akun **Supabase** (supabase.com) — paling mudah pakai project cloud.
- Editor (VS Code).

## 1. Buat project Supabase
Dashboard Supabase → **New project**. Lalu **Settings → API**, catat:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY` (untuk Edge Functions nanti)

## 2. Siapkan database (URUT, jangan dibalik)
Buka **SQL Editor** di Supabase, jalankan isi tiap file berurutan:
1. `supabase/migrations/0001_init.sql`   (tabel, enum, index)
2. `supabase/migrations/0002_functions_triggers.sql`  (updated_at, audit, auto-calc, rollup pagu)
3. `supabase/migrations/0003_rls.sql`    (RLS + policy per peran)
4. `supabase/seed.sql`                   (roles, permissions, master, akun)

> Alternatif via CLI: `supabase link --project-ref <ref>` → `supabase db push` → jalankan `seed.sql`.
> Jika muncul `relation ... does not exist`, berarti urutan file terlewat.

## 3. Konfigurasi & jalankan frontend
```bash
cd sippt
npm install
cp .env.example .env.local      # isi URL + anon key dari langkah 1
npm run dev                     # buka http://localhost:3000
```

## 4. Buat pengguna pertama (WAJIB — belum ada menu daftar/registrasi)
1. Supabase → **Authentication → Users → Add user** (email + password, centang *Auto Confirm*).
   Trigger otomatis membuat baris `user_profiles`, tetapi `role_id` & `satker_id` masih NULL.
2. Di **SQL Editor**, set peran + satker (ganti EMAIL_ANDA):
```sql
update user_profiles set
  role_id   = (select id from roles where nama = 'Administrator'),
  satker_id = (select id from master_satker where kode_satker = '287494'),
  nama = 'Admin', jabatan = 'Administrator'
where id = (select id from auth.users where email = 'EMAIL_ANDA');
```
3. Login di aplikasi → Dashboard → **Penganggaran → Buat Usulan** → grid RUH siap dipakai.

## 5. Peran lain (opsional)
Buat user lain lalu set `role_id` ke `Operator` / `Reviewer` / `Pimpinan`. Operator **wajib** punya `satker_id` (hanya bisa mengelola data satker sendiri sesuai RLS).

## Troubleshooting cepat
| Gejala | Penyebab & solusi |
|---|---|
| Login sukses, menu cuma "Dashboard", data kosong | `role_id`/`satker_id` user masih NULL → ulangi langkah 4.2 |
| `relation "..." does not exist` saat seed | Urutan SQL salah → jalankan 0001→0002→0003→seed |
| Error nested select (mis. `master_satker!satker_id`) | Sesuaikan nama constraint FK proyek Anda di query |
| `next build` error karena ESM | Hapus `"type": "module"` di `package.json` (hanya dipakai untuk uji Node) |
| Realtime grid tak ter-refresh | Aktifkan Realtime untuk tabel `usulan_struktur` di Supabase → Database → Replication |

## Perintah berguna
```bash
npm run dev        # mode pengembangan
npm run build      # build produksi
npm run typecheck  # tsc --noEmit
npm run db:types   # generate src/types/database.ts (butuh Supabase CLI)
```

## Uji logika murni (tanpa browser)
```bash
node --experimental-strip-types test_tree.mjs      # util tree-grid (10/10)
node --experimental-strip-types test_toolbar.mjs   # toolbar dinamis (9/9)
```
