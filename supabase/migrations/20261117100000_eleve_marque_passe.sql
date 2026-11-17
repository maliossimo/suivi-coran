-- =====================================================================
--  « Passé avec le Cheikh » : l'élève (majeur, responsable) le marque aussi.
--
--   - Par passage de séance et par partie de « Ce que je connais » : pas encore passé (« aucun »),
--     passé · à refaire (« ecoute » : récité devant le Cheikh, à retravailler) ou passé · validé.
--   - L'élève marque ses propres passages et acquis ; son Cheikh garde la même possibilité.
--     Le dernier qui marque a raison ; la marque est signée par celui qui la pose.
--   - Les marques ne passent toujours QUE par marquer_passages / marquer_acquis / valider_seance :
--     une mise à jour directe ne peut pas les forger (triggers inchangés sur ce point).
--   - Aucune donnée ne change : seules les fonctions de marquage s'ouvrent à l'élève.
-- =====================================================================

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
  if v_eleve is null or (v_eleve is distinct from auth.uid() and not encadre(v_eleve)) then
    raise exception 'Réservé à l''élève et à son Cheikh' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('app.marquage_passage', 'oui', true);
  update passages
     set corrige_par = case when p_etat = 'aucun' then null else auth.uid() end,
         corrige_le  = case when p_etat = 'aucun' then null else coalesce(corrige_le, now()) end,
         valide_par  = case when p_etat = 'valide' then auth.uid() else null end,
         valide_le   = case when p_etat = 'valide' then now() else null end
   where seance_id = p_seance
     and (p_ordres is null or ordre = any (p_ordres));
  perform set_config('app.marquage_passage', '', true);
end $$;

revoke all on function public.marquer_passages(uuid, text, smallint[]) from public, anon;
grant execute on function public.marquer_passages(uuid, text, smallint[]) to authenticated;

-- « Valider en un geste » : l'élève (pour sa séance) ou son Cheikh.
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
  if v_eleve is null or (v_eleve is distinct from auth.uid() and not encadre(v_eleve)) then
    raise exception 'Validation réservée à l''élève et à son Cheikh' using errcode = 'insufficient_privilege';
  end if;
  perform public.marquer_passages(p_seance, 'valide');
  -- Le trigger tracer_modif renseigne modifiee_par / modifiee_le.
  update seances set duree_min = duree_min where id = p_seance;
end $$;

-- ---------- Acquis : même chose ----------
create or replace function public.proteger_acquis() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.eleve_id is distinct from old.eleve_id then
    raise exception 'Élève non modifiable' using errcode = 'insufficient_privilege';
  end if;
  if auth.uid() is null then
    return new; -- console, conversion de lecture
  end if;
  if coalesce(current_setting('app.marquage_acquis', true), '') = 'oui' then
    -- marquer_acquis : la marque est signée par celui qui la pose (l'élève ou son Cheikh).
    new.ecoute_par := case when new.ecoute_le is null then null else auth.uid() end;
    return new;
  end if;
  if not encadre(new.eleve_id) then
    -- L'élève : hors de marquer_acquis, il déclare et choisit a_ecouter, il ne forge pas de marque.
    if tg_op = 'INSERT' then
      new.ecoute_par := null; new.ecoute_le := null; new.valide_le := null;
    else
      new.ecoute_par := old.ecoute_par; new.ecoute_le := old.ecoute_le; new.valide_le := old.valide_le;
    end if;
  elsif tg_op = 'UPDATE' and (new.ecoute_le is distinct from old.ecoute_le
                              or new.valide_le is distinct from old.valide_le) then
    -- L'encadrant signe ce qu'il marque.
    new.ecoute_par := case when new.ecoute_le is null and new.valide_le is null then null else auth.uid() end;
  end if;
  return new;
end $$;

create or replace function public.marquer_acquis(p_id uuid, p_etat text) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_n integer;
begin
  if p_etat not in ('aucun', 'ecoute', 'valide') then
    raise exception 'État inconnu' using errcode = 'invalid_parameter_value';
  end if;
  perform set_config('app.marquage_acquis', 'oui', true);
  update acquis
     set ecoute_le = case p_etat when 'aucun' then null else coalesce(ecoute_le, now()) end,
         valide_le = case p_etat when 'valide' then coalesce(valide_le, now()) else null end
   where id = p_id and (eleve_id = auth.uid() or encadre(eleve_id));
  get diagnostics v_n = row_count;
  perform set_config('app.marquage_acquis', '', true);
  if v_n = 0 then
    raise exception 'Partie introuvable' using errcode = 'insufficient_privilege';
  end if;
end $$;
revoke all on function public.marquer_acquis(uuid, text) from public, anon;
grant execute on function public.marquer_acquis(uuid, text) to authenticated;
