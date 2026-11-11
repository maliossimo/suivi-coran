-- =====================================================================
--  Invitations par QR code : le maître affiche un code de classe, les élèves
--  le scannent et créent eux-mêmes leur compte, rattaché à l'établissement.
--
--  La création du compte se fait côté serveur (clé service role), après
--  vérification du code : la table n'est jamais lisible par un anonyme.
-- =====================================================================
create table public.invitations_classe (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  uuid not null references public.etablissements(id) on delete cascade,
  cree_par          uuid references public.profils(id) on delete set null,
  code              text not null unique check (char_length(code) between 20 and 64),
  expire_le         timestamptz not null,
  actif             boolean not null default true,
  utilisations      integer not null default 0 check (utilisations >= 0),
  cree_le           timestamptz not null default now()
);
create index on public.invitations_classe (etablissement_id);

alter table public.invitations_classe enable row level security;

-- Le maître voit et gère les codes de son établissement ; l'admin voit tout.
create policy invitations_lecture on public.invitations_classe for select
  using (est_admin() or (mon_role() = 'maitre' and etablissement_id = (select etablissement_id from profils where id = auth.uid())));

create policy invitations_creation on public.invitations_classe for insert
  with check (
    mon_role() = 'maitre'
    and cree_par = auth.uid()
    and etablissement_id = (select etablissement_id from profils where id = auth.uid())
    and utilisations = 0
  );

create policy invitations_modification on public.invitations_classe for update
  using (est_admin() or (mon_role() = 'maitre' and etablissement_id = (select etablissement_id from profils where id = auth.uid())))
  with check (est_admin() or (mon_role() = 'maitre' and etablissement_id = (select etablissement_id from profils where id = auth.uid())));

create trigger t_audit after insert or update or delete on public.invitations_classe
  for each row execute function public.auditer();
