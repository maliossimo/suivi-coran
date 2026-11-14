-- =====================================================================
--  « L'appli s'est trompée » : un élève signale une remarque de la vérification tajwid
--  qu'il pense fausse. On garde le mot, les règles en cause et la remarque, jamais l'audio.
--  Sert à régler le moteur (les règles qui se trompent le plus). Lisible par son auteur et l'admin.
-- =====================================================================

create table public.signalements_tajwid (
  id        uuid primary key default gen_random_uuid(),
  auteur_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
  lecture   public.lecture not null default 'hafs',
  sourate   smallint not null check (sourate between 1 and 114),
  verset    smallint not null check (verset between 1 and 286),
  mot       text not null check (char_length(mot) between 1 and 60),
  regles    text[] not null default '{}' check (coalesce(array_length(regles, 1), 0) <= 10),
  remarque  text check (char_length(remarque) <= 300),
  cree_le   timestamptz not null default now()
);
create index signalements_tajwid_date on public.signalements_tajwid (cree_le desc);
create index signalements_tajwid_auteur on public.signalements_tajwid (auteur_id);

alter table public.signalements_tajwid enable row level security;

create policy signalements_tajwid_inserer on public.signalements_tajwid
  for insert to authenticated with check (auteur_id = auth.uid() and cree_le >= now() - interval '1 minute');
create policy signalements_tajwid_lire on public.signalements_tajwid
  for select to authenticated using (auteur_id = auth.uid() or est_admin());
-- Ni modification ni suppression : un signalement est une trace.

-- Au plus 30 signalements par personne et par jour (évite le remplissage de la table).
create or replace function public.limiter_signalements_tajwid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.cree_le := now();
  if (select count(*) from signalements_tajwid
       where auteur_id = new.auteur_id and cree_le > now() - interval '1 day') >= 30 then
    raise exception 'Trop de signalements aujourd''hui.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger signalements_tajwid_limite before insert on public.signalements_tajwid
  for each row execute function public.limiter_signalements_tajwid();
