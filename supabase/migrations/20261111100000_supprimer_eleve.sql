-- =====================================================================
--  Suppression définitive d'un élève (droit à l'effacement).
--
--  Règles, vérifiées ici par la base (pas seulement par l'interface) :
--   - seul le maître de l'élève (même établissement) ou l'admin peut supprimer ;
--   - l'élève doit d'abord avoir été archivé (actif = false) ;
--   - on supprime le compte de connexion (auth.users) : par cascade, le profil,
--     les séances, passages, objectifs, bilans et commentaires disparaissent ;
--   - le journal d'audit est purgé des données personnelles de l'élève et ne
--     garde qu'une ligne « SUPPRESSION_ELEVE » : qui a supprimé, et quand.
-- =====================================================================
create or replace function public.supprimer_eleve(p_eleve uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profil public.profils;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = 'insufficient_privilege';
  end if;

  select * into v_profil from profils where id = p_eleve;
  if not found or v_profil.role <> 'eleve' then
    raise exception 'Élève introuvable' using errcode = 'no_data_found';
  end if;
  if not (est_admin() or est_maitre_de(p_eleve)) then
    raise exception 'Suppression réservée au maître de l''élève' using errcode = 'insufficient_privilege';
  end if;
  if v_profil.actif then
    raise exception 'Archive l''élève avant de le supprimer' using errcode = 'check_violation';
  end if;

  -- Compte de connexion → cascade sur toutes les données de l'élève.
  delete from auth.users where id = p_eleve;

  -- Effacement des données personnelles conservées dans le journal.
  -- (Les passages supprimés dans cette même transaction n'ont plus d'élève
  -- rattaché au moment de l'audit : on les reconnaît à l'heure de transaction.)
  update journal_audit
     set avant = null, apres = null
   where eleve_id = p_eleve
      or (table_nom = 'passages' and eleve_id is null and quand = now());

  insert into journal_audit (acteur_id, action, table_nom, ligne_id, eleve_id)
  values (auth.uid(), 'SUPPRESSION_ELEVE', 'profils', p_eleve::text, p_eleve);
end $$;

revoke all on function public.supprimer_eleve(uuid) from public, anon;
grant execute on function public.supprimer_eleve(uuid) to authenticated;
