# SIPPT — Sistem Informasi Perencanaan dan Penganggaran Terintegrasi

Aplikasi web penganggaran pemerintah dengan workflow & tampilan menyerupai **SAKTI Kemenkeu**. Penyusunan usulan anggaran hierarkis: BA → Program → Kegiatan → KRO → RO → Komponen → Sub Komponen → Akun → Detail Belanja.

> **Status paket ini:** fondasi backend + kontrak bersama sudah jadi & teruji. UI per-modul dikerjakan bertahap (lihat Roadmap). Lingkungan pembuatan tidak punya akses npm/Supabase, jadi build Next.js dan migrasi dijalankan di mesin Anda.

## Tumpukan teknologi
Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, TanStack Table, Zustand, React Hook Form, Zod, Lucide. Backend: Supabase (PostgreSQL, Auth, Storage, RLS, Realtime, Edge Functions, Trigger). Deploy: Vercel (frontend) + Supabase (backend/storage).

## Struktur folder (target)
```
sippt/
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_init.sql              # extensions, enums, semua tabel + index
│  │  ├─ 0002_functions_triggers.sql# updated_at, audit, auto-calc, rollup pagu
│  │  └─ 0003_rls.sql               # helper + policy per peran
│  ├─ seed.sql                      # roles, permissions, master, akun
│  └─ functions/                    # Edge Functions (import-excel, export-pdf, …)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ (dashboard)/
│  │  │  ├─ dashboard/              # MODUL 1
│  │  │  ├─ penganggaran/[usulanId]/# MODUL 2 (tree-grid SAKTI)
│  │  │  ├─ review/                 # workflow persetujuan
│  │  │  ├─ monitoring/
│  │  │  ├─ referensi/[master]/     # MODUL 5 CRUD master
│  │  │  └─ pengguna/               # MODUL 6
│  │  └─ layout.tsx
│  ├─ components/
│  │  ├─ ui/                        # Shadcn
│  │  ├─ grid/                      # TreeGrid, Toolbar, RowRenderer
│  │  └─ modals/                    # ReferencePicker (modal pemilihan referensi)
│  ├─ lib/
│  │  ├─ supabase.ts                # ✅ client browser + server
│  │  ├─ constants.ts               # ✅ level, status, kategori, helper format
│  │  ├─ schemas.ts                 # ✅ Zod
│  │  └─ tree.ts                    # ✅ buildTree / flattenForGrid (inti grid)
│  ├─ store/                        # Zustand (penganggaran, selection, clipboard)
│  └─ types/database.ts             # ✅ tipe (di-generate dari Supabase)
└─ middleware.ts                    # refresh sesi Supabase
```
Tanda ✅ = sudah disertakan di paket ini.

## Lapisan database (sudah jadi & inti dari spesifikasi)
Jalankan berurutan di Supabase SQL Editor atau `supabase db push`:
1. `0001_init.sql` — extension `pgcrypto`; enum `kategori_belanja`, `level_struktur`, `status_usulan`, `audit_action`; seluruh tabel master & transaksi sesuai MODUL 4 (plus `master_satker`, `master_kementerian`, `master_unit_eselon1` yang dibutuhkan header & seed); index pencarian/navigasi.
2. `0002_functions_triggers.sql`:
   - `updated_at` otomatis di semua tabel.
   - **Audit log** generik (`fn_audit_log`) mencatat user (`auth.uid()`), tabel, aksi, data lama & baru ke `audit_logs` — sesuai bagian AUDIT LOG.
   - **Auto-calculate**: `jumlah` baris `DETAIL` = `volume × harga`.
   - **Rollup pagu**: `jumlah` tiap parent = Σ anak, naik sampai root, lalu memperbarui `usulan_anggaran.total_anggaran`. Aman dari rekursi via `pg_trigger_depth()`.
   - Auto-buat `user_profiles` saat user Auth baru lahir.
3. `0003_rls.sql` — RLS aktif di semua tabel + helper `current_role_name()`, `current_satker_id()`, `is_admin()`. Kebijakan sesuai spesifikasi: Administrator full; Operator hanya satker sendiri; Reviewer hanya usulan `Diajukan/Direview`; Pimpinan read-only; master data baca-untuk-semua, tulis-Administrator; `audit_logs` baca-Administrator.
4. `seed.sql` — 4 roles, matriks permissions, BA 022 Kemenhub → Unit BPSDMP → Satker PIP Makassar, Program 12.DL → Kegiatan 3996 → KRO SAB → RO 004, dan 8 akun contoh.

### Auto-kalkulasi (kunci kesamaan dengan SAKTI)
Tulis/ubah satu baris `DETAIL` → trigger menghitung `jumlah`, lalu me-rollup pagu komponen→…→KRO dan total usulan **otomatis di database**, sehingga semua klien (Realtime) melihat angka konsisten tanpa perhitungan ganda di frontend.

## Inti MODUL 2 — tree-grid (sudah jadi & teruji)
`src/lib/tree.ts` mengubah baris `usulan_struktur` menjadi daftar flat ala SAKTI: kedalaman per level, agregasi `jumlah` berjenjang, baris-info (Lokasi / Jumlah Komponen Utama [100.00%] / KPPN), dan penomoran detail `00.00. n -Uraian`. Teruji via `test_tree.mjs` (10/10 lulus).

Toolbar dinamis (klik parent → tombol anak), aturan resmi SAKTI: pilih level **Kegiatan/KRO** → tampil *Tambah KRO* + *Tambah RO*; pilih **RO** → *Tambah Komponen*; **Komponen** → *Tambah Sub Komponen*; **Sub Komponen** → *Tambah Akun*; **Akun** → *Tambah Detail*. Logika ini diisi di komponen `Toolbar` memakai `CHILD_OF` di `constants.ts`.

## Modal Pemilihan Referensi (MODUL 3)
Satu komponen `ReferencePicker` reusable: Search Box + Pagination + Tabel (Kode, Nama) + single/double-click select. Sumber data per level via Server-Side Search/Pagination ke tabel `master_*` (mis. RO = `master_ro` difilter `kro_id`). Untuk KRO dipakai mode tanpa dropdown + tombol "Oke" hijau (sesuai contoh SAKTI).

## Realtime & RLS
Supabase Realtime di-subscribe pada `usulan_anggaran` & `usulan_struktur` → Dashboard dan grid menyegarkan diri saat ada usulan baru/revisi/persetujuan/perubahan nilai tanpa reload. RLS memastikan setiap peran hanya menerima baris yang berhak.

## Edge Functions (kerangka)
`import-excel`, `validasi-struktur`, `hitung-pagu`, `sinkronisasi-dashboard`, `export-pdf`, `export-excel`. Import/validasi/perhitungan berat dijalankan di server agar aman dari RLS bypass dan konsisten.

## Cara menjalankan
```bash
# 1) Database
supabase start                       # atau pakai project cloud
supabase db push                     # menerapkan migrations/
psql "$DATABASE_URL" -f supabase/seed.sql   # atau jalankan seed.sql di SQL editor
# 2) Frontend
cp .env.example .env.local           # isi URL & anon key
npm install
npm run db:types                     # generate src/types/database.ts dari skema
npm run dev
```

## Roadmap (per modul, urut kerja yang saya sarankan)
1. **Auth + layout + middleware + RLS-aware shell** — ✅ **SELESAI** (login Supabase, sidebar navy + topbar, dark/light via next-themes, menu tersaring per peran, skeleton primitive).
2. **MODUL 2 Penganggaran** — ✅ **SELESAI (inti)**: TreeGrid ala SAKTI, Toolbar dinamis (klik parent → tombol anak), ReferencePicker (server-side search+pagination), form Sub Komponen & Detail (Vol×Harga), auto-calc + rollup via trigger DB, Realtime refresh. Sisa: inline editing, drag-and-drop, copy-paste subtree, multi-select.
3. **MODUL 3** ReferencePicker — ✅ komponen reusable sudah dipakai modul 2.
4. **MODUL 1 Dashboard** — kerangka card sudah ada; tabel usulan (server search/filter/sort) + Realtime menyusul.
5. **Workflow persetujuan** (Draft→…→Final).
6. **MODUL 5 Referensi** CRUD + Import/Export Excel + Audit Log viewer.
7. **MODUL 6 Pengguna**.
8. **Upload Kertas Kerja** (Storage + Edge Function).
9. **Export Excel/PDF** & polish mobile.

### Yang ditambahkan pada paket ini (fase #1 & #2)
```
src/app/layout.tsx, globals.css, page.tsx           # tema + redirect
src/app/(auth)/{layout,login/page}.tsx              # login
src/app/(dashboard)/layout.tsx                      # shell terlindungi
src/app/(dashboard)/dashboard/page.tsx              # dashboard awal
src/app/(dashboard)/penganggaran/page.tsx           # daftar + buat usulan (server action)
src/app/(dashboard)/penganggaran/[usulanId]/{page,data}.tsx
src/components/theme.tsx                             # ThemeProvider + toggle
src/components/ui/{index,modal}.tsx                  # Button/Input/Select/Card/Badge/Skeleton/Modal
src/components/shell/{nav.ts,shell.tsx}             # sidebar+topbar, menu per-peran
src/components/grid/{tree-grid,toolbar?,reference-picker,detail-form,subkomponen-form,penganggaran-client}.tsx
src/lib/{auth,toolbar,penganggaran-api}.ts          # sesi, aksi toolbar, CRUD+search
src/store/penganggaran.ts                           # Zustand (selection + clipboard)
tailwind.config.ts, postcss.config.mjs, next.config.ts
```
Logika murni teruji: `test_tree.mjs` (10/10) & `test_toolbar.mjs` (9/9) via `node --experimental-strip-types`.

Berikutnya saran saya: **inline editing + copy-paste** di grid, lalu **MODUL 1 tabel usulan realtime**. Sebutkan mana yang didahulukan.
