-- =====================================================================
--  Comptes liés : une même personne peut avoir deux comptes (par exemple l'administrateur et un
--  compte élève) et passer de l'un à l'autre depuis l'appli, sans retaper le mot de passe.
--
--  Chaque lien existe dans les deux sens (A → B et B → A). Seul l'administrateur crée ou retire un lien,
--  par le serveur (clé « service role ») : aucun utilisateur ne peut s'écrire un lien lui-même.
--  Chacun ne lit que ses propres liens ; l'administrateur les lit tous.
-- =====================================================================

create table public.comptes_lies (
  compte  uuid not null references public.profils(id) on delete cascade,
  lie_a   uuid not null references public.profils(id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (compte, lie_a),
  check (compte <> lie_a)
);

alter table public.comptes_lies enable row level security;

create policy comptes_lies_lecture on public.comptes_lies for select
  using (compte = auth.uid() or est_admin());

revoke all on public.comptes_lies from anon;
revoke insert, update, delete, truncate on public.comptes_lies from authenticated;
