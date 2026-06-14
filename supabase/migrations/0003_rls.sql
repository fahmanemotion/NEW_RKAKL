-- ============================================================================
-- SIPPT — Migration 0003: Row Level Security (RLS)
--   Administrator : full access
--   Operator      : hanya data satker sendiri (usulan)
--   Reviewer      : hanya usulan berstatus review/diajukan
--   Pimpinan      : read-only seluruh data
--   Master data   : read untuk semua user login, tulis hanya Administrator
-- ============================================================================

-- ── Helper functions (security definer, dipakai di policy) ──────────────────
-- security definer + owner (postgres) → query helper TIDAK terkena RLS,
-- sehingga policy yang memanggilnya tidak rekursif. search_path dikunci.
create or replace function current_role_name()
returns text language sql stable security definer set search_path = public, auth as $$
  select r.nama from user_profiles up
    join roles r on r.id = up.role_id
   where up.id = auth.uid();
$$;

create or replace function current_satker_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select satker_id from user_profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(current_role_name() = 'Administrator', false);
$$;

-- ── Aktifkan RLS pada seluruh tabel ─────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'master_ba','master_kementerian','master_unit_eselon1','master_satker',
    'master_program','master_kegiatan','master_kro','master_ro','master_komponen',
    'master_sub_komponen','master_akun','roles','user_profiles','permissions',
    'usulan_anggaran','usulan_struktur','dokumen_kertas_kerja','audit_logs'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ── Master data: SELECT semua user login; tulis hanya Administrator ──────────
do $$
declare t text;
begin
  foreach t in array array[
    'master_ba','master_kementerian','master_unit_eselon1','master_satker',
    'master_program','master_kegiatan','master_kro','master_ro','master_komponen',
    'master_sub_komponen','master_akun'
  ] loop
    execute format('drop policy if exists p_read on %I;', t);
    execute format('create policy p_read on %I for select to authenticated using (true);', t);
    execute format('drop policy if exists p_write on %I;', t);
    execute format('create policy p_write on %I for all to authenticated
                    using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;

-- ── roles & permissions: baca semua, kelola Administrator ───────────────────
drop policy if exists p_roles_read on roles;
create policy p_roles_read on roles for select to authenticated using (true);
drop policy if exists p_roles_admin on roles;
create policy p_roles_admin on roles for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists p_perm_read on permissions;
create policy p_perm_read on permissions for select to authenticated using (true);
drop policy if exists p_perm_admin on permissions;
create policy p_perm_admin on permissions for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── user_profiles: lihat/ubah profil sendiri; Administrator kelola semua ────
drop policy if exists p_profile_self on user_profiles;
create policy p_profile_self on user_profiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists p_profile_self_upd on user_profiles;
create policy p_profile_self_upd on user_profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
drop policy if exists p_profile_admin on user_profiles;
create policy p_profile_admin on user_profiles for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── usulan_anggaran ─────────────────────────────────────────────────────────
drop policy if exists p_usulan_select on usulan_anggaran;
create policy p_usulan_select on usulan_anggaran for select to authenticated using (
  is_admin()
  or current_role_name() = 'Pimpinan'
  or (current_role_name() = 'Operator' and satker_id = current_satker_id())
  or (current_role_name() = 'Reviewer' and status in ('Diajukan','Direview'))
);
drop policy if exists p_usulan_ins on usulan_anggaran;
create policy p_usulan_ins on usulan_anggaran for insert to authenticated with check (
  is_admin() or (current_role_name() = 'Operator' and satker_id = current_satker_id())
);
drop policy if exists p_usulan_upd on usulan_anggaran;
create policy p_usulan_upd on usulan_anggaran for update to authenticated using (
  is_admin()
  or (current_role_name() = 'Operator' and satker_id = current_satker_id())
  or (current_role_name() = 'Reviewer' and status in ('Diajukan','Direview'))
) with check (
  is_admin()
  or (current_role_name() = 'Operator' and satker_id = current_satker_id())
  or (current_role_name() = 'Reviewer' and status in ('Diajukan','Direview','Disetujui'))
);
drop policy if exists p_usulan_del on usulan_anggaran;
create policy p_usulan_del on usulan_anggaran for delete to authenticated using (
  is_admin() or (current_role_name() = 'Operator' and satker_id = current_satker_id() and status = 'Draft')
);

-- ── usulan_struktur: ikut hak akses usulan induknya ─────────────────────────
drop policy if exists p_struktur_all on usulan_struktur;
create policy p_struktur_all on usulan_struktur for all to authenticated
  using (exists (select 1 from usulan_anggaran ua where ua.id = usulan_id))
  with check (exists (select 1 from usulan_anggaran ua where ua.id = usulan_id));
-- Catatan: keterlihatan baris struktur otomatis tersaring oleh RLS usulan_anggaran
-- melalui sub-query di atas (baris induk yang tak terlihat → struktur tak lolos).

-- ── dokumen_kertas_kerja ────────────────────────────────────────────────────
drop policy if exists p_dok_all on dokumen_kertas_kerja;
create policy p_dok_all on dokumen_kertas_kerja for all to authenticated
  using (exists (select 1 from usulan_anggaran ua where ua.id = usulan_id))
  with check (exists (select 1 from usulan_anggaran ua where ua.id = usulan_id));

-- ── audit_logs: hanya Administrator yang boleh membaca ──────────────────────
drop policy if exists p_audit_read on audit_logs;
create policy p_audit_read on audit_logs for select to authenticated using (is_admin());
-- INSERT dilakukan oleh trigger (security definer); tidak perlu policy insert publik.
