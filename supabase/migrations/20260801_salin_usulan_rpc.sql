-- 20260801_salin_usulan_rpc.sql
-- PERBAIKAN: "canceling statement due to statement timeout" saat Salin Anggaran.
--
-- Penyebab: penyalinan dilakukan baris-per-baris dari aplikasi. Setiap baris
-- memicu trigger tingkat-baris yang mahal:
--   • trg_rollup_pagu  → menelusuri SELURUH leluhur (sum + update per tingkat)
--                        lalu memperbarui total usulan. Untuk ribuan baris,
--                        ini menjadi puluhan ribu operasi.
--   • trg_audit        → menulis satu baris audit_logs untuk setiap baris.
--   • struktur_no_dup  → satu query EXISTS untuk setiap baris.
-- Akibatnya satu pernyataan INSERT melewati batas statement_timeout Supabase.
--
-- Solusi: satu RPC set-based (INSERT ... SELECT) dengan flag sesi yang
-- melewati trigger berat selama penyalinan. Nilai `jumlah` disalin apa adanya
-- (sudah benar di sumber), jadi rollup tidak diperlukan; total usulan dihitung
-- sekali di akhir. Karena berjalan dalam SATU transaksi, kegagalan otomatis
-- ter-rollback — tidak ada lagi sisa baris separuh jalan.

-- ── 1) Flag sesi: aktif hanya selama penyalinan massal ──────────────────────
create or replace function fn_bulk_copy_active()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.bulk_copy', true), '') = 'on';
$$;

-- ── 2) Trigger berat: lewati saat penyalinan massal ─────────────────────────
create or replace function fn_rollup_pagu()
returns trigger language plpgsql as $$
declare
  v_node    uuid;
  v_usulan  uuid;
begin
  -- Dilewati saat salin massal; total dihitung sekali di akhir oleh RPC.
  if fn_bulk_copy_active() then
    return coalesce(new, old);
  end if;

  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    v_node := old.parent_id; v_usulan := old.usulan_id;
  else
    v_node := new.parent_id; v_usulan := new.usulan_id;
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

create or replace function fn_audit_log()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid := auth.uid();
  v_old  jsonb;
  v_new  jsonb;
  v_id   text;
begin
  -- Salin massal tidak diaudit baris-per-baris (puluhan ribu baris audit).
  if fn_bulk_copy_active() then
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

create or replace function trg_struktur_no_dup()
returns trigger language plpgsql as $$
begin
  -- Sumber salinan sudah tervalidasi; lewati agar penyalinan tidak lambat.
  if fn_bulk_copy_active() then
    return NEW;
  end if;

  if NEW.level in
     ('PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN') then
    if exists (
      select 1
      from usulan_struktur s
      where s.usulan_id = NEW.usulan_id
        and s.level     = NEW.level
        and s.parent_id is not distinct from NEW.parent_id
        and s.id <> NEW.id
        and (
              (NEW.referensi_id is not null
                 and s.referensi_id = NEW.referensi_id)
           or (NEW.kode is not null
                 and upper(btrim(s.kode)) = upper(btrim(NEW.kode)))
            )
    ) then
      raise exception
        'DUPLIKAT: % "%" sudah ada pada usulan ini dan tidak boleh ditambahkan dua kali.',
        NEW.level, coalesce(NEW.kode, NEW.uraian, '')
        using errcode = 'unique_violation';
    end if;
  end if;
  return NEW;
end $$;

-- ── 3) RPC penyalinan set-based ─────────────────────────────────────────────
create or replace function copy_usulan_struktur(
  p_target  uuid,
  p_source  uuid,
  p_replace boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid          uuid := auth.uid();
  v_user_satker  uuid;
  v_is_admin     boolean := false;
  v_t_status     text;
  v_t_satker     uuid;
  v_s_satker     uuid;
  v_s_total      numeric(18,2);
  v_count        integer := 0;
begin
  if v_uid is null then
    raise exception 'Tidak terautentikasi.';
  end if;

  select up.satker_id, coalesce(r.nama, '') = 'Administrator'
    into v_user_satker, v_is_admin
    from user_profiles up
    left join roles r on r.id = up.role_id
   where up.id = v_uid;

  select status::text, satker_id into v_t_status, v_t_satker
    from usulan_anggaran where id = p_target;
  if v_t_status is null then
    raise exception 'Usulan tujuan tidak ditemukan.';
  end if;
  if not v_is_admin and v_t_satker is distinct from v_user_satker then
    raise exception 'Anda tidak berhak menyalin ke usulan ini.';
  end if;
  if v_t_status <> 'Draft' then
    raise exception 'Hanya usulan berstatus Draft yang dapat diisi dengan salinan.';
  end if;

  select satker_id, total_anggaran into v_s_satker, v_s_total
    from usulan_anggaran where id = p_source;
  if v_s_satker is null then
    raise exception 'Usulan sumber tidak ditemukan.';
  end if;
  if v_s_satker is distinct from v_t_satker then
    raise exception 'Hanya bisa menyalin dari usulan satker yang sama.';
  end if;

  if exists (select 1 from usulan_struktur where usulan_id = p_target) then
    if not p_replace then
      raise exception 'TARGET_NOT_EMPTY'
        using errcode = 'raise_exception';
    end if;
    perform set_config('app.bulk_copy', 'on', true);
    delete from usulan_struktur where usulan_id = p_target;
  end if;

  -- Aktifkan mode salin massal (berlaku sampai transaksi selesai).
  perform set_config('app.bulk_copy', 'on', true);

  -- Satu pernyataan: FK self-reference diperiksa di akhir statement sehingga
  -- urutan induk/anak tidak menjadi masalah.
  with src as (
    select * from usulan_struktur where usulan_id = p_source
  ),
  map as (
    select id as old_id, gen_random_uuid() as new_id from src
  )
  insert into usulan_struktur (
    id, usulan_id, parent_id, level, referensi_id, kode, uraian,
    volume, satuan, harga, jumlah, sumber_dana, jenis_belanja, urutan
  )
  select m.new_id,
         p_target,
         pm.new_id,
         s.level,
         s.referensi_id,
         s.kode,
         s.uraian,
         s.volume,
         s.satuan,
         s.harga,
         s.jumlah,
         s.sumber_dana,
         s.jenis_belanja,
         s.urutan
    from src s
    join map m  on m.old_id  = s.id
    left join map pm on pm.old_id = s.parent_id;

  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'Usulan sumber tidak memiliki rincian untuk disalin.';
  end if;

  -- Total dihitung sekali (rollup per baris dilewati saat mode salin massal).
  update usulan_anggaran ua
     set total_anggaran = coalesce((
           select sum(s.jumlah) from usulan_struktur s
            where s.usulan_id = p_target and s.parent_id is null), 0),
         program_id  = coalesce(ua.program_id,
                        (select program_id  from usulan_anggaran where id = p_source)),
         kegiatan_id = coalesce(ua.kegiatan_id,
                        (select kegiatan_id from usulan_anggaran where id = p_source))
   where ua.id = p_target;

  return v_count;
end $$;

revoke all on function copy_usulan_struktur(uuid, uuid, boolean) from public;
grant execute on function copy_usulan_struktur(uuid, uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
