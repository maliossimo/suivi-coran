-- =====================================================================
--  1. Essais du mode Réciter : score et mots fautifs de chaque essai (jamais l'audio), pour
--     l'historique d'un passage et les « mots difficiles » de chaque élève.
--  2. Sécurité : appareils connus de chaque compte, et événements (nouvel appareil, mot de passe
--     erroné), lisibles par l'admin seulement.
--  3. Vitesse réelle : temps d'affichage mesurés sur les téléphones, lisibles par l'admin.
-- =====================================================================

-- ---------- 1. Essais du mode Réciter ----------
create table public.essais_recitation (
  id        uuid primary key default gen_random_uuid(),
  eleve_id  uuid not null default auth.uid() references public.profils (id) on delete cascade,
  lecture   public.lecture not null default 'hafs',
  sourate   smallint not null check (sourate between 1 and 114),
  du        smallint not null check (du between 1 and 286),
  au        smallint not null check (au between du and 286),
  score     smallint not null check (score between 0 and 100),
  -- [{ "verset": 2, "mot": "…", "regle": "ghunnah" }], 40 au plus
  fautes    jsonb not null default '[]'::jsonb
            check (jsonb_typeof(fautes) = 'array' and jsonb_array_length(fautes) <= 40),
  cree_le   timestamptz not null default now()
);
create index essais_recitation_eleve on public.essais_recitation (eleve_id, sourate, cree_le desc);

alter table public.essais_recitation enable row level security;
create policy essais_recitation_inserer on public.essais_recitation
  for insert to authenticated with check (eleve_id = auth.uid());
create policy essais_recitation_lire on public.essais_recitation
  for select to authenticated using (peut_acceder(eleve_id) or eleve_id = auth.uid());
create policy essais_recitation_supprimer on public.essais_recitation
  for delete to authenticated using (eleve_id = auth.uid() or est_admin());

-- Au plus 200 essais par personne et par jour.
create or replace function public.limiter_essais_recitation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.cree_le := now();
  if (select count(*) from essais_recitation
       where eleve_id = new.eleve_id and cree_le > now() - interval '1 day') >= 200 then
    raise exception 'Trop d''essais aujourd''hui.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger essais_recitation_limite before insert on public.essais_recitation
  for each row execute function public.limiter_essais_recitation();

-- ---------- 2. Sécurité ----------
create table public.appareils_connus (
  personne_id uuid not null references public.profils (id) on delete cascade,
  appareil    text not null check (char_length(appareil) between 8 and 64),
  libelle     text not null default '' check (char_length(libelle) <= 80),
  premier     timestamptz not null default now(),
  dernier     timestamptz not null default now(),
  primary key (personne_id, appareil)
);
alter table public.appareils_connus enable row level security;
create policy appareils_connus_lire on public.appareils_connus
  for select to authenticated using (est_admin());
-- Écriture seulement par noter_appareil().

create table public.evenements_securite (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('nouvel_appareil', 'echec_connexion')),
  personne_id uuid references public.profils (id) on delete cascade,
  -- Pour un mot de passe erroné : l'adresse saisie (le compte n'existe peut-être pas).
  email       text check (char_length(email) <= 120),
  libelle     text not null default '' check (char_length(libelle) <= 80),
  cree_le     timestamptz not null default now()
);
create index evenements_securite_date on public.evenements_securite (cree_le desc);
alter table public.evenements_securite enable row level security;
create policy evenements_securite_lire on public.evenements_securite
  for select to authenticated using (est_admin());
-- Écriture : noter_appareil() (connecté) et le serveur (clé de service) pour les échecs de connexion.

-- La personne connectée signale son appareil (identifiant tiré au hasard et gardé sur le téléphone) ;
-- un appareil jamais vu pour ce compte (sauf le tout premier) devient un événement pour l'admin.
create or replace function public.noter_appareil(p_appareil text, p_libelle text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  deja  boolean;
  aucun boolean;
begin
  if auth.uid() is null or char_length(p_appareil) not between 8 and 64 then
    return false;
  end if;
  select exists (select 1 from appareils_connus where personne_id = auth.uid() and appareil = p_appareil),
         not exists (select 1 from appareils_connus where personne_id = auth.uid())
    into deja, aucun;
  if deja then
    update appareils_connus set dernier = now(), libelle = left(coalesce(p_libelle, ''), 80)
      where personne_id = auth.uid() and appareil = p_appareil;
    return false;
  end if;
  -- Au plus 20 appareils par compte : au-delà, on n'en note plus (évite le remplissage).
  if (select count(*) from appareils_connus where personne_id = auth.uid()) >= 20 then
    return false;
  end if;
  insert into appareils_connus (personne_id, appareil, libelle)
    values (auth.uid(), p_appareil, left(coalesce(p_libelle, ''), 80));
  if not aucun then
    insert into evenements_securite (type, personne_id, libelle)
      values ('nouvel_appareil', auth.uid(), left(coalesce(p_libelle, ''), 80));
  end if;
  return not aucun;
end $$;
revoke all on function public.noter_appareil(text, text) from public, anon;
grant execute on function public.noter_appareil(text, text) to authenticated;

-- ---------- 3. Vitesse réelle ----------
create table public.mesures_vitesse (
  id        bigint generated always as identity primary key,
  page      text not null check (char_length(page) between 1 and 120),
  metrique  text not null check (metrique in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  valeur    real not null check (valeur >= 0 and valeur < 600000),
  mobile    boolean not null default true,
  cree_le   timestamptz not null default now()
);
create index mesures_vitesse_date on public.mesures_vitesse (cree_le desc);
alter table public.mesures_vitesse enable row level security;
create policy mesures_vitesse_lire on public.mesures_vitesse
  for select to authenticated using (est_admin());
-- Écriture seulement par noter_vitesse() : sans lien avec la personne (mesure anonyme).

create or replace function public.noter_vitesse(p_page text, p_metrique text, p_valeur real, p_mobile boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;
  end if;
  -- Au plus 2 000 mesures par heure pour tout le site.
  if (select count(*) from mesures_vitesse where cree_le > now() - interval '1 hour') >= 2000 then
    return;
  end if;
  insert into mesures_vitesse (page, metrique, valeur, mobile)
    values (left(p_page, 120), p_metrique, p_valeur, coalesce(p_mobile, true));
  -- De temps en temps, on efface ce qui a plus de 90 jours (mesures) ou 180 jours (sécurité).
  if random() < 0.01 then
    delete from mesures_vitesse where cree_le < now() - interval '90 days';
    delete from evenements_securite where cree_le < now() - interval '180 days';
  end if;
end $$;
revoke all on function public.noter_vitesse(text, text, real, boolean) from public, anon;
grant execute on function public.noter_vitesse(text, text, real, boolean) to authenticated;
