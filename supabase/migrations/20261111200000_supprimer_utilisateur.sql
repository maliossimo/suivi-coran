-- =====================================================================
--  Suppression définitive d'un utilisateur (élève ou maître) par l'admin.
--
--  - Réservé à l'admin ; impossible de se supprimer soi-même ou de supprimer
--    un autre admin.
--  - Élève : son compte et toutes ses données disparaissent (cascade).
--  - Maître : ses élèves et leurs séances restent dans l'établissement ;
--    ses commentaires sont supprimés et ses corrections deviennent anonymes
--    (modifiee_par / modifie_par = null).
--  - Le journal d'audit est purgé des données personnelles de la personne et
--    garde une ligne « SUPPRESSION_UTILISATEUR » (qui, quand).
-- =====================================================================

-- Pendant une suppression, on ne trace pas comme « modification » le simple
-- effacement des références à la personne supprimée.
create or replace function public.tracer_modif() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.suppression_en_cours', true), '') = 'oui' then
    return new;
  end if;
  if auth.uid() is distinct from new.eleve_id then
    if tg_table_name = 'seances' then
      new.modifiee_par := auth.uid(); new.modifiee_le := now();
    else
      new.modifie_par := auth.uid(); new.modifie_le := now();
    end if;
  end if;
  return new;
end $$;

create or replace function public.supprimer_utilisateur(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profil public.profils;
begin
  if not est_admin() then
    raise exception 'Suppression réservée à l''administrateur' using errcode = 'insufficient_privilege';
  end if;
  if p_id = auth.uid() then
    raise exception 'Impossible de supprimer son propre compte' using errcode = 'check_violation';
  end if;

  select * into v_profil from profils where id = p_id;
  if not found then
    raise exception 'Utilisateur introuvable' using errcode = 'no_data_found';
  end if;
  if v_profil.role = 'admin' then
    raise exception 'Un administrateur ne peut pas être supprimé ici' using errcode = 'check_violation';
  end if;

  perform set_config('app.suppression_en_cours', 'oui', true);

  -- Références laissées par un maître chez ses élèves.
  update seances         set modifiee_par = null where modifiee_par = p_id;
  update objectifs       set modifie_par  = null where modifie_par  = p_id;
  update bilans_mensuels set modifie_par  = null where modifie_par  = p_id;
  delete from commentaires where auteur_id = p_id;

  -- Compte de connexion → cascade sur le profil et, pour un élève, ses données.
  delete from auth.users where id = p_id;

  perform set_config('app.suppression_en_cours', '', true);

  -- Effacement des données personnelles conservées dans le journal.
  update journal_audit
     set avant = null, apres = null
   where eleve_id = p_id
      or quand = now(); -- tout ce que cette suppression vient de tracer

  insert into journal_audit (acteur_id, action, table_nom, ligne_id, eleve_id)
  values (auth.uid(), 'SUPPRESSION_UTILISATEUR', 'profils', p_id::text,
          case when v_profil.role = 'eleve' then p_id end);
end $$;

revoke all on function public.supprimer_utilisateur(uuid) from public, anon;
grant execute on function public.supprimer_utilisateur(uuid) to authenticated;
