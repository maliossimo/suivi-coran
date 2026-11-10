-- =====================================================================
--  Suivi cours Coran — schéma initial
--
--  Établissements (une école / un maître et sa classe), trois rôles :
--    eleve  : lit et écrit uniquement son propre suivi
--    maitre : lit, corrige et commente le suivi des élèves de SON établissement
--    admin  : (le fournisseur de l'outil) voit tout, gère comptes et établissements,
--             lit le journal d'audit
--  Deux types de séance : apprentissage / révision. Le tajwid se travaille
--  dans chaque séance (champ dédié).
--  Semaines de la fiche : S1 = jours 1-7, S2 = 8-14, S3 = 15-21, S4 = 22-28,
--  S5 = 29 → fin du mois ; « Jour N » = N-ième jour du bloc.
-- =====================================================================

-- ---------- Types ----------------------------------------------------
create type public.role_utilisateur as enum ('eleve', 'maitre', 'admin');
create type public.type_seance      as enum ('apprentissage', 'revision');
create type public.periode_objectif as enum ('hebdo', 'mensuel');
create type public.statut_objectif  as enum ('en_cours', 'atteint', 'non_atteint');

-- ---------- Établissements -------------------------------------------
create table public.etablissements (
  id       uuid primary key default gen_random_uuid(),
  nom      text not null check (length(trim(nom)) between 1 and 120),
  actif    boolean not null default true,
  cree_le  timestamptz not null default now()
);

-- ---------- Profils (1-1 avec auth.users) -----------------------------
create table public.profils (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              public.role_utilisateur not null default 'eleve',
  etablissement_id  uuid references public.etablissements(id) on delete restrict,
  prenom            text not null default '' check (length(prenom) <= 60),
  nom               text not null default '' check (length(nom) <= 60),
  date_naissance    date,
  actif             boolean not null default true,   -- désactiver sans perdre l'historique
  cree_le           timestamptz not null default now(),
  -- un admin n'appartient à aucun établissement
  check (role <> 'admin' or etablissement_id is null)
);
create index on public.profils (etablissement_id, role);

-- ---------- Référentiel des sourates ----------------------------------
create table public.sourates (
  numero                 smallint primary key check (numero between 1 and 114),
  nom_ar                 text not null,
  nom_latin              text not null,
  nb_versets             smallint not null check (nb_versets > 0),
  -- index global (1..6236) du 1er verset : un passage devient un intervalle
  -- sur tout le Coran (calcul des versets distincts, % du Coran…)
  premier_verset_global  smallint not null unique check (premier_verset_global between 1 and 6236)
);

-- ---------- Séances (un jour × un type) -------------------------------
create table public.seances (
  id            uuid primary key default gen_random_uuid(),
  eleve_id      uuid not null references public.profils(id) on delete cascade,
  date          date not null,
  type          public.type_seance not null,
  duree_min     smallint not null check (duree_min between 0 and 600),
  tajwid        text check (length(tajwid) <= 1000),       -- règles travaillées
  note_libre    text check (length(note_libre) <= 2000),   -- texte libre de l'élève
  cree_le       timestamptz not null default now(),
  modifiee_par  uuid references public.profils(id),        -- renseigné si quelqu'un d'autre que l'élève modifie
  modifiee_le   timestamptz,
  unique (eleve_id, date, type)
);
create index on public.seances (eleve_id, date);

-- ---------- Passages (plusieurs parties travaillées par séance) -------
create table public.passages (
  id             uuid primary key default gen_random_uuid(),
  seance_id      uuid not null references public.seances(id) on delete cascade,
  ordre          smallint not null default 1,
  sourate_debut  smallint not null references public.sourates(numero),
  verset_debut   smallint not null check (verset_debut >= 1),
  sourate_fin    smallint not null references public.sourates(numero),
  verset_fin     smallint not null check (verset_fin >= 1),
  check ((sourate_debut, verset_debut) <= (sourate_fin, verset_fin))
);
create index on public.passages (seance_id, ordre);

-- ---------- Objectifs (hebdo & mensuel) -------------------------------
create table public.objectifs (
  id           uuid primary key default gen_random_uuid(),
  eleve_id     uuid not null references public.profils(id) on delete cascade,
  type         public.type_seance not null,
  periode      public.periode_objectif not null,
  mois         date not null check (extract(day from mois) = 1),
  semaine      smallint check (semaine between 1 and 5),   -- null pour un objectif mensuel
  description  text not null check (length(description) <= 300),
  statut       public.statut_objectif not null default 'en_cours',
  modifie_par  uuid references public.profils(id),
  modifie_le   timestamptz,
  unique nulls not distinct (eleve_id, type, mois, semaine),
  check ((periode = 'hebdo') = (semaine is not null))
);

-- ---------- Bilans mensuels -------------------------------------------
create table public.bilans_mensuels (
  id             uuid primary key default gen_random_uuid(),
  eleve_id       uuid not null references public.profils(id) on delete cascade,
  type           public.type_seance not null,
  mois           date not null check (extract(day from mois) = 1),
  bien_memorise  text check (length(bien_memorise) <= 1000),
  a_renforcer    text check (length(a_renforcer) <= 1000),
  modifie_par    uuid references public.profils(id),
  modifie_le     timestamptz,
  unique (eleve_id, type, mois)
);

-- ---------- Commentaires (maître ou admin) ----------------------------
create table public.commentaires (
  id           uuid primary key default gen_random_uuid(),
  eleve_id     uuid not null references public.profils(id) on delete cascade,
  auteur_id    uuid not null references public.profils(id),
  seance_id    uuid references public.seances(id) on delete cascade,
  objectif_id  uuid references public.objectifs(id) on delete cascade,
  bilan_id     uuid references public.bilans_mensuels(id) on delete cascade,
  texte        text not null check (length(trim(texte)) between 1 and 1000),
  cree_le      timestamptz not null default now(),
  check (num_nonnulls(seance_id, objectif_id, bilan_id) = 1)
);
create index on public.commentaires (eleve_id, cree_le desc);

-- ---------- Journal d'audit (lecture admin, écriture par triggers seulement)
create table public.journal_audit (
  id         bigint generated always as identity primary key,
  quand      timestamptz not null default now(),
  acteur_id  uuid,                 -- auth.uid() ; null = console SQL / service
  action     text not null,        -- INSERT | UPDATE | DELETE
  table_nom  text not null,
  ligne_id   text,
  eleve_id   uuid,
  avant      jsonb,
  apres      jsonb
);
create index on public.journal_audit (quand desc);
create index on public.journal_audit (eleve_id, quand desc);

-- =====================================================================
--  Fonctions d'autorisation (security definer : lisent profils sans RLS)
-- =====================================================================
create or replace function public.mon_role() returns public.role_utilisateur
language sql stable security definer set search_path = public as $$
  select role from profils where id = auth.uid() and actif;
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() = 'admin', false);
$$;

create or replace function public.est_eleve() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() = 'eleve', false);
$$;

-- Le viewer est-il le maître (actif) de cet élève ?
create or replace function public.est_maitre_de(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profils m join profils e on e.etablissement_id = m.etablissement_id
    where m.id = auth.uid() and m.role = 'maitre' and m.actif
      and e.id = p_eleve and e.role = 'eleve'
  );
$$;

-- Encadrant = admin ou maître de l'élève
create or replace function public.encadre(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select est_admin() or est_maitre_de(p_eleve);
$$;

-- Accès au suivi : l'élève lui-même (actif) ou un encadrant
create or replace function public.peut_acceder(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (p_eleve = auth.uid() and est_eleve()) or encadre(p_eleve);
$$;

-- =====================================================================
--  Triggers
-- =====================================================================

-- Versets dans les bornes de la sourate
create or replace function public.verifier_versets() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.verset_debut > (select nb_versets from sourates where numero = new.sourate_debut)
  or new.verset_fin   > (select nb_versets from sourates where numero = new.sourate_fin) then
    raise exception 'Verset hors de la sourate' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_verifier_versets before insert or update on public.passages
  for each row execute function public.verifier_versets();

-- Pas de saisie dans le futur (fuseau Europe/Paris)
create or replace function public.verifier_date() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.date > (now() at time zone 'Europe/Paris')::date then
    raise exception 'Date dans le futur' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_verifier_date before insert or update on public.seances
  for each row execute function public.verifier_date();

-- Traçabilité : modification par quelqu'un d'autre que l'élève
create or replace function public.tracer_modif() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is distinct from new.eleve_id then
    if tg_table_name = 'seances' then
      new.modifiee_par := auth.uid(); new.modifiee_le := now();
    else
      new.modifie_par := auth.uid(); new.modifie_le := now();
    end if;
  end if;
  return new;
end $$;
create trigger t_tracer before update on public.seances
  for each row execute function public.tracer_modif();
create trigger t_tracer before update on public.objectifs
  for each row execute function public.tracer_modif();
create trigger t_tracer before update on public.bilans_mensuels
  for each row execute function public.tracer_modif();

-- Passage modifié par un encadrant → séance parente marquée « corrigée »
create or replace function public.tracer_passage() returns trigger
language plpgsql security definer set search_path = public as $$
declare s uuid := coalesce(new.seance_id, old.seance_id);
begin
  if auth.uid() is distinct from (select eleve_id from seances where id = s) then
    update seances set modifiee_par = auth.uid(), modifiee_le = now() where id = s;
  end if;
  return coalesce(new, old);
end $$;
create trigger t_tracer_passage after insert or update or delete on public.passages
  for each row execute function public.tracer_passage();

-- Champs sensibles du profil : rôle, établissement, actif → admin uniquement.
-- auth.uid() null = console SQL / service role (amorçage du premier admin).
create or replace function public.proteger_profil() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not est_admin() then
    if new.role is distinct from old.role
       or new.etablissement_id is distinct from old.etablissement_id then
      raise exception 'Modification réservée à l''administrateur' using errcode = 'insufficient_privilege';
    end if;
    -- un maître peut (dés)activer ses élèves, pas lui-même ni un autre maître
    if new.actif is distinct from old.actif and not est_maitre_de(old.id) then
      raise exception 'Modification réservée à l''administrateur' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;
create trigger t_proteger_profil before update on public.profils
  for each row execute function public.proteger_profil();

-- Création du profil à l'invitation. Les métadonnées viennent du serveur
-- (API admin, inscription publique désactivée). Le rôle admin n'est JAMAIS
-- attribué ici : il se donne à la main depuis la console SQL.
create or replace function public.creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := new.raw_user_meta_data->>'role';
begin
  insert into profils (id, role, etablissement_id, prenom, nom)
  values (
    new.id,
    case when r = 'maitre' then 'maitre'::role_utilisateur else 'eleve'::role_utilisateur end,
    nullif(new.raw_user_meta_data->>'etablissement_id', '')::uuid,
    left(coalesce(new.raw_user_meta_data->>'prenom', ''), 60),
    left(coalesce(new.raw_user_meta_data->>'nom', ''), 60)
  );
  return new;
end $$;
create trigger t_creer_profil after insert on auth.users
  for each row execute function public.creer_profil();

-- Journal d'audit générique
create or replace function public.auditer() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ligne jsonb := to_jsonb(coalesce(new, old));
begin
  insert into journal_audit (acteur_id, action, table_nom, ligne_id, eleve_id, avant, apres)
  values (
    auth.uid(), tg_op, tg_table_name, ligne->>'id',
    case
      when tg_table_name = 'profils'  then (ligne->>'id')::uuid
      when tg_table_name = 'passages' then (select eleve_id from seances where id = (ligne->>'seance_id')::uuid)
      else (ligne->>'eleve_id')::uuid
    end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger t_audit after insert or update or delete on public.etablissements   for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.profils          for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.seances          for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.passages         for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.objectifs        for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.bilans_mensuels  for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.commentaires     for each row execute function public.auditer();

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.etablissements   enable row level security;
alter table public.profils          enable row level security;
alter table public.sourates         enable row level security;
alter table public.seances          enable row level security;
alter table public.passages         enable row level security;
alter table public.objectifs        enable row level security;
alter table public.bilans_mensuels  enable row level security;
alter table public.commentaires     enable row level security;
alter table public.journal_audit    enable row level security;

-- Référentiel
create policy sourates_lecture on public.sourates for select to authenticated using (true);

-- Établissements : chacun lit le sien, l'admin gère tout
create policy etab_lecture on public.etablissements for select to authenticated
  using (est_admin() or id = (select etablissement_id from public.profils where id = auth.uid()));
create policy etab_admin on public.etablissements for all to authenticated
  using (est_admin()) with check (est_admin());

-- Profils : soi-même, son maître, l'admin
create policy profil_lecture on public.profils for select to authenticated
  using (id = auth.uid() or est_admin()
         or (role = 'eleve' and est_maitre_de(id)));
create policy profil_maj on public.profils for update to authenticated
  using (id = auth.uid() or est_admin() or est_maitre_de(id))
  with check (id = auth.uid() or est_admin() or est_maitre_de(id));

-- Suivi : élève (le sien), maître (ses élèves), admin (tout)
create policy seances_acces on public.seances for all to authenticated
  using (peut_acceder(eleve_id)) with check (peut_acceder(eleve_id));
create policy objectifs_acces on public.objectifs for all to authenticated
  using (peut_acceder(eleve_id)) with check (peut_acceder(eleve_id));
create policy bilans_acces on public.bilans_mensuels for all to authenticated
  using (peut_acceder(eleve_id)) with check (peut_acceder(eleve_id));
create policy passages_acces on public.passages for all to authenticated
  using      (exists (select 1 from public.seances s where s.id = seance_id and peut_acceder(s.eleve_id)))
  with check (exists (select 1 from public.seances s where s.id = seance_id and peut_acceder(s.eleve_id)));

-- Commentaires : lus par l'élève concerné, écrits par un encadrant en son nom propre
create policy commentaires_lecture on public.commentaires for select to authenticated
  using (peut_acceder(eleve_id));
create policy commentaires_ecriture on public.commentaires for insert to authenticated
  with check (encadre(eleve_id) and auteur_id = auth.uid());
create policy commentaires_maj on public.commentaires for update to authenticated
  using (auteur_id = auth.uid() or est_admin()) with check (auteur_id = auth.uid() or est_admin());
create policy commentaires_suppr on public.commentaires for delete to authenticated
  using (auteur_id = auth.uid() or est_admin());

-- Journal : lecture admin uniquement, aucune écriture directe
create policy audit_lecture on public.journal_audit for select to authenticated using (est_admin());
revoke insert, update, delete, truncate on public.journal_audit from anon, authenticated;
