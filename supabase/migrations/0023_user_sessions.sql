-- 0023_user_sessions.sql
-- Single-session di LAPISAN APLIKASI (lihat src/lib/session.ts).
--
-- Menegakkan "satu akun = satu sesi aktif" tanpa bergantung pada rotasi
-- refresh-token Supabase. Identitas sesi = klaim `session_id` access-token
-- Supabase (stabil melewati refresh). Satu baris per user (PK user_id):
-- login baru menimpa baris → sesi device lama otomatis superseded.
--
-- Catatan: nonaktifkan "single session per user" / pelemahan token-revoke di
-- Supabase Auth dashboard jika sebelumnya diaktifkan, agar enforcement hanya di
-- lapisan aplikasi ini (mencegah logout palsu akibat balapan refresh SSR).

create table if not exists public.user_sessions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  session_id uuid        not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

alter table public.user_sessions enable row level security;

-- User hanya boleh membaca & menulis BARISNYA SENDIRI (cegah IDOR / penendangan
-- sesi orang lain).
drop policy if exists us_select on public.user_sessions;
create policy us_select on public.user_sessions
  for select using (user_id = auth.uid());

drop policy if exists us_insert on public.user_sessions;
create policy us_insert on public.user_sessions
  for insert with check (user_id = auth.uid());

drop policy if exists us_update on public.user_sessions;
create policy us_update on public.user_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.user_sessions to authenticated;
