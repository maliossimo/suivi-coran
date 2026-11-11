-- =====================================================================
--  Correction par passage.
--
--  Avant : une seule mention « corrigée » pour toute la séance. Un passage
--  ajouté par l'élève après le passage chez le Cheikh restait donc affiché
--  comme corrigé.
--  Maintenant : chaque passage garde qui l'a vu (corrige_par) :
--   - un encadrant qui enregistre la séance marque tous ses passages ;
--   - l'élève ne peut ni poser ni retirer cette marque lui-même ; un passage
--     qu'il ajoute ou modifie est « pas encore vu » ;
--   - enregistrer_seance ne remplace plus tous les passages : ceux qui sont
--     inchangés sont conservés (avec leur marque).
--  Et : deux passages d'une même séance ne peuvent plus se chevaucher.
-- =====================================================================

alter table public.passages
  add column corrige_par uuid references public.profils(id) on delete set null,
  add column corrige_le  timestamptz;

-- Reprise de l'existant : les passages des séances déjà corrigées sont marqués.
update public.passages p
   set corrige_par = s.modifiee_par, corrige_le = s.modifiee_le
  from public.seances s
 where s.id = p.seance_id and s.modifiee_par is not null;

-- Marque posée par la base, jamais par l'élève.
create or replace function public.marquer_correction_passage() returns trigger
language plpgsql set search_path = public as $$
declare
  v_eleve uuid := (select eleve_id from seances where id = new.seance_id);
begin
  if coalesce(current_setting('app.suppression_en_cours', true), '') = 'oui' then
    return new;
  end if;
  if auth.uid() is not null and auth.uid() is distinct from v_eleve then
    -- un encadrant enregistre : il a vu ce passage
    new.corrige_par := auth.uid();
    new.corrige_le  := now();
  elsif tg_op = 'INSERT'
     or (new.sourate_debut, new.verset_debut, new.sourate_fin, new.verset_fin)
        is distinct from (old.sourate_debut, old.verset_debut, old.sourate_fin, old.verset_fin) then
    -- l'élève ajoute ou change un passage : pas encore vu
    new.corrige_par := null;
    new.corrige_le  := null;
  else
    -- l'élève réordonne seulement : la marque ne bouge pas (et ne peut pas être forgée)
    new.corrige_par := old.corrige_par;
    new.corrige_le  := old.corrige_le;
  end if;
  return new;
end $$;
create trigger t_marquer_correction before insert or update on public.passages
  for each row execute function public.marquer_correction_passage();

-- Pendant la suppression d'un utilisateur, l'effacement de ses références
-- n'est pas une « correction ».
create or replace function public.tracer_passage() returns trigger
language plpgsql security definer set search_path = public as $$
declare s uuid := coalesce(new.seance_id, old.seance_id);
begin
  if coalesce(current_setting('app.suppression_en_cours', true), '') = 'oui' then
    return coalesce(new, old);
  end if;
  if auth.uid() is distinct from (select eleve_id from seances where id = s) then
    update seances set modifiee_par = auth.uid(), modifiee_le = now() where id = s;
  end if;
  return coalesce(new, old);
end $$;

-- Lecture des passages envoyés (JSON) sous forme de table.
create or replace function public.passages_entree(p_passages jsonb)
returns table (ordre smallint, sd smallint, vd smallint, sf smallint, vf smallint)
language sql immutable set search_path = public as $$
  select p.ordre::smallint,
         (p.valeur->>'sourateDebut')::smallint,
         (p.valeur->>'versetDebut')::smallint,
         (p.valeur->>'sourateFin')::smallint,
         (p.valeur->>'versetFin')::smallint
  from jsonb_array_elements(coalesce(p_passages, '[]'::jsonb)) with ordinality as p(valeur, ordre)
$$;
revoke all on function public.passages_entree(jsonb) from public, anon;
grant execute on function public.passages_entree(jsonb) to authenticated;

-- Enregistrement : séance + passages, sans perdre les passages inchangés.
create or replace function public.enregistrer_seance(
  p_date      date,
  p_type      public.type_seance,
  p_duree     smallint,
  p_tajwid    text,
  p_note      text,
  p_passages  jsonb,
  p_eleve     uuid default auth.uid()
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(coalesce(p_passages, '[]'::jsonb)) <> 'array' then
    raise exception 'Passages invalides' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_array_length(coalesce(p_passages, '[]'::jsonb)) > 20 then
    raise exception 'Trop de passages (20 au maximum)' using errcode = 'invalid_parameter_value';
  end if;

  -- Deux passages d'une même séance ne se chevauchent pas.
  if exists (
    select 1
      from passages_entree(p_passages) a
      join passages_entree(p_passages) b on a.ordre < b.ordre
      join sourates a1 on a1.numero = a.sd join sourates a2 on a2.numero = a.sf
      join sourates b1 on b1.numero = b.sd join sourates b2 on b2.numero = b.sf
     where a1.premier_verset_global + a.vd - 1 <= b2.premier_verset_global + b.vf - 1
       and b1.premier_verset_global + b.vd - 1 <= a2.premier_verset_global + a.vf - 1
  ) then
    raise exception 'Deux passages se chevauchent' using errcode = 'check_violation';
  end if;

  insert into seances (eleve_id, date, type, duree_min, tajwid, note_libre)
  values (p_eleve, p_date, p_type, p_duree, nullif(trim(p_tajwid), ''), nullif(trim(p_note), ''))
  on conflict (eleve_id, date, type) do update
    set duree_min  = excluded.duree_min,
        tajwid     = excluded.tajwid,
        note_libre = excluded.note_libre
  returning id into v_id;

  -- 1. Passages retirés ou modifiés : supprimés.
  delete from passages x
   where x.seance_id = v_id
     and not exists (select 1 from passages_entree(p_passages) e
                      where (e.sd, e.vd, e.sf, e.vf) = (x.sourate_debut, x.verset_debut, x.sourate_fin, x.verset_fin));

  -- 2. Passages inchangés : conservés (l'ordre est mis à jour ; un encadrant les marque vus).
  update passages x
     set ordre = e.ordre
    from passages_entree(p_passages) e
   where x.seance_id = v_id
     and (e.sd, e.vd, e.sf, e.vf) = (x.sourate_debut, x.verset_debut, x.sourate_fin, x.verset_fin)
     and (x.ordre is distinct from e.ordre or auth.uid() is distinct from p_eleve);

  -- 3. Nouveaux passages.
  insert into passages (seance_id, ordre, sourate_debut, verset_debut, sourate_fin, verset_fin)
  select v_id, e.ordre, e.sd, e.vd, e.sf, e.vf
    from passages_entree(p_passages) e
   where not exists (select 1 from passages x
                      where x.seance_id = v_id
                        and (e.sd, e.vd, e.sf, e.vf) = (x.sourate_debut, x.verset_debut, x.sourate_fin, x.verset_fin));

  return v_id;
end $$;

revoke all on function public.enregistrer_seance(date, public.type_seance, smallint, text, text, jsonb, uuid) from public, anon;
grant execute on function public.enregistrer_seance(date, public.type_seance, smallint, text, text, jsonb, uuid) to authenticated;
