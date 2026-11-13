-- =====================================================================
--  Double vérification de l'administrateur.
--  Dès que l'admin a enregistré au moins un appareil (appli d'authentification),
--  ses droits d'admin n'existent que dans une session qui a passé le code
--  (niveau « aal2 » du jeton de connexion). Avec son seul mot de passe, même volé,
--  on n'obtient aucun droit d'admin sur les données.
--  Tant qu'aucun appareil n'est enregistré, rien ne change (pas de blocage).
-- =====================================================================

create or replace function public.double_verification_satisfaite() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
         where f.user_id = auth.uid() and f.status::text = 'verified'
      )
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() = 'admin', false) and double_verification_satisfaite();
$$;
