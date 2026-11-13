-- =====================================================================
--  Retrait de la double vérification de l'administrateur (appli
--  d'authentification puis code par e-mail) : les droits d'admin
--  dépendent à nouveau du seul rôle, comme à l'origine.
-- =====================================================================

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() = 'admin', false);
$$;

drop function if exists public.session_verifiee();
drop function if exists public.double_verification_satisfaite();
drop table if exists public.sessions_verifiees;
