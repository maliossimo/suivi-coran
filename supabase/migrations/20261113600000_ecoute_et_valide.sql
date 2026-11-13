-- =====================================================================
--  Deux étapes du Cheikh par passage : « écouté » puis « validé ».
--
--   - Écouté  : corrige_par / corrige_le (l'ancienne marque « vu par le Cheikh »).
--   - Validé  : valide_par / valide_le (acquis) ; valider suppose avoir écouté.
--   - Les marques existantes restent « écouté » : rien n'est validé d'office.
--   - Seul un encadrant de l'élève pose ou retire ces marques (marquer_passages) ;
--     l'élève ne peut ni les poser ni les forger, et un passage qu'il ajoute ou
--     modifie redevient « pas encore écouté ».
-- =====================================================================

alter table public.passages
  add column valide_par uuid references public.profils (id) on delete set null,
  add column valide_le  timestamptz,
  add constraint passage_valide_apres_ecoute check (valide_le is null or corrige_le is not null);

create or replace function public.marquer_correction_passage() returns trigger
language plpgsql set search_path = public as $$
declare
  v_eleve uuid := (select eleve_id from seances where id = new.seance_id);
begin
  if coalesce(current_setting('app.suppression_en_cours', true), '') = 'oui' then
    return new;
  end if;
  -- Marquage explicite par marquer_passages : les valeurs posées par la fonction sont gardées.
  if coalesce(current_setting('app.marquage_passage', true), '') = 'oui' then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(current_setting('app.conversion_lecture', true), '') = 'oui' then
    -- même passage, autre numérotation : ce que le Cheikh a écouté ou validé le reste
    new.corrige_par := old.corrige_par;
    new.corrige_le  := old.corrige_le;
    new.valide_par  := old.valide_par;
    new.valide_le   := old.valide_le;
    return new;
  end if;
  if auth.uid() is not null and auth.uid() is distinct from v_eleve then
    -- un encadrant enregistre la séance : il a écouté ce passage ; une validation déjà posée reste
    new.corrige_par := auth.uid();
    new.corrige_le  := now();
    if tg_op = 'UPDATE' then
      new.valide_par := old.valide_par;
      new.valide_le  := old.valide_le;
    else
      new.valide_par := null;
      new.valide_le  := null;
    end if;
  elsif tg_op = 'INSERT'
     or (new.sourate_debut, new.verset_debut, new.sourate_fin, new.verset_fin)
        is distinct from (old.sourate_debut, old.verset_debut, old.sourate_fin, old.verset_fin) then
    -- l'élève ajoute ou change un passage : pas encore écouté
    new.corrige_par := null;
    new.corrige_le  := null;
    new.valide_par  := null;
    new.valide_le   := null;
  else
    -- l'élève réordonne seulement : les marques ne bougent pas (et ne peuvent pas être forgées)
    new.corrige_par := old.corrige_par;
    new.corrige_le  := old.corrige_le;
    new.valide_par  := old.valide_par;
    new.valide_le   := old.valide_le;
  end if;
  return new;
end $$;

-- Écouter, valider ou retirer la marque : tous les passages de la séance, ou ceux dont
-- l'ordre est donné. Réservé à un encadrant de l'élève (jamais l'élève lui-même).
create or replace function public.marquer_passages(
  p_seance uuid,
  p_etat   text,
  p_ordres smallint[] default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_eleve uuid;
begin
  if p_etat not in ('aucun', 'ecoute', 'valide') then
    raise exception 'État inconnu' using errcode = 'invalid_parameter_value';
  end if;
  select eleve_id into v_eleve from seances where id = p_seance;
  if v_eleve is null or v_eleve = auth.uid() or not encadre(v_eleve) then
    raise exception 'Réservé au Cheikh de l''élève' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('app.marquage_passage', 'oui', true);
  update passages
     set corrige_par = case when p_etat = 'aucun' then null
                            when corrige_le is null then auth.uid() else corrige_par end,
         corrige_le  = case when p_etat = 'aucun' then null else coalesce(corrige_le, now()) end,
         valide_par  = case when p_etat = 'valide' then auth.uid() else null end,
         valide_le   = case when p_etat = 'valide' then now() else null end
   where seance_id = p_seance
     and (p_ordres is null or ordre = any (p_ordres));
  perform set_config('app.marquage_passage', '', true);
end $$;

revoke all on function public.marquer_passages(uuid, text, smallint[]) from public, anon;
grant execute on function public.marquer_passages(uuid, text, smallint[]) to authenticated;

-- « Valider en un geste » depuis la fiche : tous les passages écoutés ET validés.
create or replace function public.valider_seance(p_seance uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_eleve uuid;
begin
  select eleve_id into v_eleve from seances where id = p_seance;
  if v_eleve is null or not encadre(v_eleve) then
    raise exception 'Validation réservée au Cheikh de l''élève' using errcode = 'insufficient_privilege';
  end if;
  perform public.marquer_passages(p_seance, 'valide');
  -- Le trigger tracer_modif renseigne modifiee_par / modifiee_le.
  update seances set duree_min = duree_min where id = p_seance;
end $$;
