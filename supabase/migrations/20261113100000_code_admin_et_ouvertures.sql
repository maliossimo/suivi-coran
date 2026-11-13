-- =====================================================================
--  1. Code de l'administrateur (remplace l'appli d'authentification).
--     Après le mot de passe, l'admin reçoit un code par e-mail. Ses droits
--     d'admin n'existent que dans une session (appareil) qui a saisi ce code :
--     avec le mot de passe seul, même volé, aucun droit d'admin sur les données.
--  2. Ouvertures de l'appli : chaque ouverture (ou retour sur l'appli déjà
--     connectée) est notée, au plus une fois par quart d'heure et par personne.
-- =====================================================================

-- ---------- 1. Sessions de l'admin qui ont saisi le code -------------------
create table public.sessions_verifiees (
  session_id  uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  verifiee_le timestamptz not null default now()
);
alter table public.sessions_verifiees enable row level security;
-- Lecture de ses propres sessions seulement ; l'écriture passe par le serveur
-- (clé « service role »), après vérification du code par Supabase.
create policy sessions_verifiees_lecture on public.sessions_verifiees
  for select to authenticated using (user_id = auth.uid());

create or replace function public.session_verifiee() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sessions_verifiees s
     where s.user_id = auth.uid()
       and s.session_id = nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'session_id', '')::uuid
  )
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() = 'admin', false) and session_verifiee();
$$;

drop function if exists public.double_verification_satisfaite();

-- ---------- 2. Ouvertures de l'appli ---------------------------------------
create table public.ouvertures (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ouverte_le timestamptz not null default now()
);
create index ouvertures_personne_date on public.ouvertures (user_id, ouverte_le desc);
create index ouvertures_date on public.ouvertures (ouverte_le desc);
alter table public.ouvertures enable row level security;

create policy ouvertures_ajout on public.ouvertures
  for insert to authenticated with check (user_id = auth.uid());
create policy ouvertures_lecture on public.ouvertures
  for select to authenticated using (user_id = auth.uid() or est_admin());

-- Une ouverture par quart d'heure et par personne ; historique gardé 180 jours.
create or replace function public.limiter_ouvertures() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.ouverte_le := now();  -- l'heure vient toujours de la base
  if exists (
    select 1 from public.ouvertures
     where user_id = new.user_id and ouverte_le > now() - interval '15 minutes'
  ) then
    return null;
  end if;
  delete from public.ouvertures where user_id = new.user_id and ouverte_le < now() - interval '180 days';
  return new;
end $$;
create trigger limiter_ouvertures before insert on public.ouvertures
  for each row execute function public.limiter_ouvertures();

-- Dernière utilisation de chaque personne (admin : tout le monde).
create or replace function public.dernieres_ouvertures()
returns table (user_id uuid, derniere timestamptz, ouvertures_7j bigint)
language sql stable security invoker set search_path = public as $$
  select o.user_id, max(o.ouverte_le), count(*) filter (where o.ouverte_le > now() - interval '7 days')
    from public.ouvertures o
   group by o.user_id
$$;
grant execute on function public.dernieres_ouvertures() to authenticated;
