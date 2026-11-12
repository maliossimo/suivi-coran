-- =====================================================================
--  Administration : état du site.
--   - sauvegardes : chaque sauvegarde nocturne réussie y est notée par le
--     workflow GitHub (API de gestion Supabase) ; l'admin voit la dernière.
--   - erreurs : erreurs rencontrées par les utilisateurs connectés (page,
--     message technique), pour que l'admin les voie sans outil extérieur.
--  Lecture : admin uniquement. Aucune donnée pédagogique.
-- =====================================================================

create table public.sauvegardes (
  id             bigint generated always as identity primary key,
  faite_le       timestamptz not null default now(),
  chiffree       boolean not null,
  taille_octets  bigint check (taille_octets >= 0)
);
alter table public.sauvegardes enable row level security;
create policy sauvegardes_admin on public.sauvegardes for select to authenticated using (est_admin());
revoke insert, update, delete on public.sauvegardes from anon, authenticated;

create table public.erreurs (
  id              bigint generated always as identity primary key,
  quand           timestamptz not null default now(),
  utilisateur_id  uuid default auth.uid() references auth.users(id) on delete set null,
  page            text not null check (length(page) <= 300),
  message         text not null check (length(message) <= 500),
  version         text check (length(version) <= 40)
);
create index on public.erreurs (quand desc);
alter table public.erreurs enable row level security;
-- Chacun peut signaler une erreur, en son nom seulement.
create policy erreurs_signaler on public.erreurs for insert to authenticated
  with check (utilisateur_id = auth.uid());
create policy erreurs_admin on public.erreurs for select to authenticated using (est_admin());
revoke update, delete on public.erreurs from anon, authenticated;

-- Pas d'avalanche : au plus 30 signalements par personne et par heure ; 30 jours gardés.
create or replace function public.limiter_erreurs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from erreurs where utilisateur_id = new.utilisateur_id
        and quand > now() - interval '1 hour') >= 30 then
    return null;
  end if;
  delete from erreurs where quand < now() - interval '30 days';
  return new;
end $$;
create trigger t_limiter_erreurs before insert on public.erreurs
  for each row execute function public.limiter_erreurs();
