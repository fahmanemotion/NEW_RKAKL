-- 0007_anti_duplikat_struktur.sql
-- Prosedur keamanan: cegah node struktur ganda pada induk yang sama dalam satu
-- usulan untuk level PROGRAM, KEGIATAN, KRO, RO, KOMPONEN, SUB_KOMPONEN.
--
-- Identitas duplikat: referensi_id yang sama ATAU kode yang sama (case-insensitive)
-- di antara sesama level dengan induk (parent_id) yang sama pada usulan yang sama.
-- Ini lapis pertahanan di sisi database — tidak bisa ditembus dari klien.

create or replace function trg_struktur_no_dup()
returns trigger
language plpgsql
as $$
begin
  if NEW.level in
     ('PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN') then
    if exists (
      select 1
      from usulan_struktur s
      where s.usulan_id = NEW.usulan_id
        and s.level     = NEW.level
        and s.parent_id is not distinct from NEW.parent_id      -- aman utk NULL
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
end;
$$;

drop trigger if exists struktur_no_dup on usulan_struktur;
create trigger struktur_no_dup
  before insert on usulan_struktur
  for each row
  execute function trg_struktur_no_dup();
