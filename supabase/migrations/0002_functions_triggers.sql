-- ============================================================================
-- SIPPT — Migration 0002: functions & triggers
--   1. updated_at otomatis
--   2. audit log (INSERT/UPDATE/DELETE) → tabel audit_logs
--   3. auto-calculate: jumlah DETAIL = volume * harga
--   4. rollup pagu: jumlah parent = Σ anak, naik sampai root + total usulan
-- ============================================================================

-- ── 1) updated_at ───────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'master_ba','master_kementerian','master_unit_eselon1','master_satker',
    'master_program','master_kegiatan','master_kro','master_ro','master_komponen',
    'master_sub_komponen','master_akun','user_profiles','usulan_anggaran','usulan_struktur'
  ] loop
    execute format('drop trigger if exists trg_updated_at on %I;', t);
    execute format('create trigger trg_updated_at before update on %I
                    for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ── 2) Audit log generik ────────────────────────────────────────────────────
create or replace function fn_audit_log()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid := auth.uid();
  v_old  jsonb;
  v_new  jsonb;
  v_id   text;
begin
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

do $$
declare t text;
begin
  foreach t in array array[
    'master_ba','master_program','master_kegiatan','master_kro','master_ro',
    'master_komponen','master_sub_komponen','master_akun','master_satker',
    'usulan_anggaran','usulan_struktur','dokumen_kertas_kerja',
    'user_profiles','roles','permissions'
  ] loop
    execute format('drop trigger if exists trg_audit on %I;', t);
    execute format('create trigger trg_audit after insert or update or delete on %I
                    for each row execute function fn_audit_log();', t);
  end loop;
end $$;

-- ── 3) Auto-calculate jumlah DETAIL = volume * harga ────────────────────────
create or replace function fn_calc_detail()
returns trigger language plpgsql as $$
begin
  if new.level = 'DETAIL' then
    new.jumlah := round(coalesce(new.volume,0) * coalesce(new.harga,0), 2);
  end if;
  return new;
end $$;

drop trigger if exists trg_calc_detail on usulan_struktur;
create trigger trg_calc_detail
  before insert or update of volume, harga, level on usulan_struktur
  for each row execute function fn_calc_detail();

-- ── 4) Rollup pagu ke atas + total usulan ───────────────────────────────────
-- Hitung ulang jumlah seluruh leluhur dari sebuah node hingga root,
-- lalu segarkan usulan_anggaran.total_anggaran. Hanya dijalankan pada
-- pemicuan tingkat-atas (pg_trigger_depth()=1) agar update beruntun
-- (yang memicu trigger lagi) tidak rekursif.
create or replace function fn_rollup_pagu()
returns trigger language plpgsql as $$
declare
  v_node    uuid;
  v_usulan  uuid;
  v_parent  uuid;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    v_node := old.parent_id; v_usulan := old.usulan_id;
  else
    v_node := new.parent_id; v_usulan := new.usulan_id;
    -- jika parent berpindah, ikut perbarui parent lama
    if tg_op = 'UPDATE' and old.parent_id is distinct from new.parent_id then
      perform fn_rollup_from(old.parent_id);
    end if;
  end if;

  perform fn_rollup_from(v_node);

  update usulan_anggaran ua
     set total_anggaran = coalesce((
       select sum(s.jumlah) from usulan_struktur s
        where s.usulan_id = v_usulan and s.parent_id is null), 0)
   where ua.id = v_usulan;

  return coalesce(new, old);
end $$;

-- Loop naik: set jumlah tiap node = Σ jumlah anak langsung, sampai root.
create or replace function fn_rollup_from(p_node uuid)
returns void language plpgsql as $$
declare
  v_cur uuid := p_node;
  v_sum numeric(18,2);
  v_par uuid;
begin
  while v_cur is not null loop
    select coalesce(sum(jumlah),0) into v_sum
      from usulan_struktur where parent_id = v_cur;

    update usulan_struktur
       set jumlah = v_sum
     where id = v_cur and level <> 'DETAIL';   -- DETAIL tidak di-rollup

    select parent_id into v_par from usulan_struktur where id = v_cur;
    v_cur := v_par;
  end loop;
end $$;

drop trigger if exists trg_rollup_pagu on usulan_struktur;
create trigger trg_rollup_pagu
  after insert or update of jumlah, parent_id or delete on usulan_struktur
  for each row execute function fn_rollup_pagu();

-- ── Helper: buat user_profiles otomatis saat user auth baru dibuat ──────────
create or replace function fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.user_profiles(id, nama)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();
