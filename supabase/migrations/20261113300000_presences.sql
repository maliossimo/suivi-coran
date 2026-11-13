-- =====================================================================
--  Présences : classes d'un établissement (ex. Coran lun/mar/jeu, Fiqh sam/dim),
--  leurs Cheikhs, leurs élèves (avec ou sans compte) et l'appel de chaque cours.
--
--  Qui fait quoi (appliqué ici, par la base) :
--  - l'admin : tout ;
--  - un Cheikh : les classes dont il est Cheikh, dans son établissement ;
--  - plus tard, le responsable d'une mosquée : lecture des présences seulement
--    (il suffira d'étendre peut_voir_classe).
--  Pour la version de test, l'interface n'est ouverte qu'à l'admin.
-- =====================================================================

create type public.statut_presence as enum ('present', 'absent', 'retard', 'excuse');

create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  nom              text not null check (char_length(btrim(nom)) between 1 and 60),
  -- Jours de cours (ISO : 1 = lundi … 7 = dimanche).
  jours            smallint[] not null default '{}'
                   check (jours <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  archivee         boolean not null default false,
  cree_le          timestamptz not null default now()
);
create index on public.classes (etablissement_id);

create table public.classes_cheikhs (
  classe_id uuid not null references public.classes (id) on delete cascade,
  maitre_id uuid not null references public.profils (id) on delete cascade,
  primary key (classe_id, maitre_id)
);
create index on public.classes_cheikhs (maitre_id);

-- Élève d'une classe : avec un compte (eleve_id) ou seulement un nom (élèves de fiqh…).
create table public.membres_classe (
  id        uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes (id) on delete cascade,
  eleve_id  uuid references public.profils (id) on delete cascade,
  prenom    text check (prenom is null or char_length(btrim(prenom)) between 1 and 60),
  nom       text check (nom is null or char_length(btrim(nom)) <= 60),
  actif     boolean not null default true,
  ajoute_le timestamptz not null default now(),
  check (eleve_id is not null or prenom is not null),
  unique (classe_id, eleve_id)
);
create index on public.membres_classe (classe_id);

create table public.appels (
  id        uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes (id) on delete cascade,
  date      date not null,
  fait_par  uuid references public.profils (id) on delete set null,
  fait_le   timestamptz not null default now(),
  unique (classe_id, date)
);

create table public.presences (
  id        uuid primary key default gen_random_uuid(),
  appel_id  uuid not null references public.appels (id) on delete cascade,
  membre_id uuid not null references public.membres_classe (id) on delete cascade,
  statut    public.statut_presence not null default 'present',
  note      text check (note is null or char_length(note) <= 200),
  unique (appel_id, membre_id)
);
create index on public.presences (membre_id);

-- ---------- Droits ---------------------------------------------------------
create or replace function public.mon_etablissement() returns uuid
language sql stable security definer set search_path = public as $$
  select etablissement_id from profils where id = auth.uid() and actif;
$$;

/** Faire l'appel, gérer les élèves : l'admin, ou un Cheikh actif de la classe (même établissement). */
create or replace function public.peut_gerer_classe(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select est_admin() or exists (
    select 1
      from classes_cheikhs cc
      join classes c on c.id = cc.classe_id
      join profils m on m.id = cc.maitre_id
     where cc.classe_id = p_classe and cc.maitre_id = auth.uid()
       and m.role = 'maitre' and m.actif and m.etablissement_id = c.etablissement_id
  );
$$;

/** Voir la classe et ses présences (le responsable de la mosquée s'ajoutera ici). */
create or replace function public.peut_voir_classe(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select peut_gerer_classe(p_classe);
$$;

alter table public.classes          enable row level security;
alter table public.classes_cheikhs  enable row level security;
alter table public.membres_classe   enable row level security;
alter table public.appels           enable row level security;
alter table public.presences        enable row level security;

create policy classes_lecture on public.classes for select to authenticated using (peut_voir_classe(id));
create policy classes_creation on public.classes for insert to authenticated
  with check (est_admin() or (mon_role() = 'maitre' and etablissement_id = mon_etablissement()));
create policy classes_modification on public.classes for update to authenticated
  using (peut_gerer_classe(id)) with check (peut_gerer_classe(id));
create policy classes_suppression on public.classes for delete to authenticated using (est_admin());

create policy cheikhs_lecture on public.classes_cheikhs for select to authenticated
  using (peut_voir_classe(classe_id));
-- Un Cheikh peut se déclarer Cheikh d'une classe de son établissement (celle qu'il vient de créer) ;
-- l'admin gère tout.
create policy cheikhs_ajout on public.classes_cheikhs for insert to authenticated
  with check (
    est_admin() or (
      maitre_id = auth.uid() and mon_role() = 'maitre'
      and exists (select 1 from classes c where c.id = classe_id and c.etablissement_id = mon_etablissement())
    )
  );
create policy cheikhs_retrait on public.classes_cheikhs for delete to authenticated using (est_admin());

create policy membres_lecture on public.membres_classe for select to authenticated
  using (peut_voir_classe(classe_id));
create policy membres_ajout on public.membres_classe for insert to authenticated
  with check (peut_gerer_classe(classe_id));
create policy membres_modification on public.membres_classe for update to authenticated
  using (peut_gerer_classe(classe_id)) with check (peut_gerer_classe(classe_id));
create policy membres_suppression on public.membres_classe for delete to authenticated
  using (peut_gerer_classe(classe_id));

create policy appels_lecture on public.appels for select to authenticated using (peut_voir_classe(classe_id));
create policy appels_ecriture on public.appels for insert to authenticated with check (peut_gerer_classe(classe_id));
create policy appels_modification on public.appels for update to authenticated
  using (peut_gerer_classe(classe_id)) with check (peut_gerer_classe(classe_id));
create policy appels_suppression on public.appels for delete to authenticated using (peut_gerer_classe(classe_id));

create policy presences_lecture on public.presences for select to authenticated
  using (exists (select 1 from appels a where a.id = appel_id and peut_voir_classe(a.classe_id)));
create policy presences_ecriture on public.presences for insert to authenticated
  with check (exists (select 1 from appels a where a.id = appel_id and peut_gerer_classe(a.classe_id)));
create policy presences_modification on public.presences for update to authenticated
  using (exists (select 1 from appels a where a.id = appel_id and peut_gerer_classe(a.classe_id)))
  with check (exists (select 1 from appels a where a.id = appel_id and peut_gerer_classe(a.classe_id)));
create policy presences_suppression on public.presences for delete to authenticated
  using (exists (select 1 from appels a where a.id = appel_id and peut_gerer_classe(a.classe_id)));

-- ---------- Cohérence ------------------------------------------------------
-- Un élève avec compte ne rejoint qu'une classe de son établissement ;
-- une présence ne concerne qu'un élève de la classe de l'appel.
create or replace function public.verifier_membre_classe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.eleve_id is not null and not exists (
    select 1 from profils e join classes c on c.id = new.classe_id
     where e.id = new.eleve_id and e.role = 'eleve' and e.etablissement_id = c.etablissement_id
  ) then
    raise exception 'Cet élève n''appartient pas à l''établissement de la classe' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger verifier_membre_classe before insert or update on public.membres_classe
  for each row execute function public.verifier_membre_classe();

create or replace function public.verifier_presence() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from appels a join membres_classe m on m.classe_id = a.classe_id
     where a.id = new.appel_id and m.id = new.membre_id
  ) then
    raise exception 'Cet élève n''est pas dans la classe de cet appel' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger verifier_presence before insert or update on public.presences
  for each row execute function public.verifier_presence();

-- ---------- Enregistrer un appel (en une fois, rejouable hors ligne) --------
-- p_presences : [{ "membre": uuid, "statut": "absent", "note": "…" }, …]
-- Les élèves non cités sont présents. Rejouer le même appel donne le même résultat.
create or replace function public.enregistrer_appel(p_classe uuid, p_date date, p_presences jsonb)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_appel uuid;
begin
  if p_date > (now() at time zone 'Europe/Paris')::date + 1 then
    raise exception 'On ne fait pas l''appel d''un cours à venir' using errcode = 'check_violation';
  end if;
  insert into appels (classe_id, date, fait_par)
  values (p_classe, p_date, auth.uid())
  on conflict (classe_id, date) do update set fait_par = excluded.fait_par, fait_le = now()
  returning id into v_appel;

  insert into presences (appel_id, membre_id, statut, note)
  select v_appel, m.id,
         coalesce((p.e ->> 'statut')::statut_presence, 'present'),
         nullif(btrim(p.e ->> 'note'), '')
    from membres_classe m
    left join lateral (
      select e from jsonb_array_elements(coalesce(p_presences, '[]'::jsonb)) e
       where (e ->> 'membre')::uuid = m.id
       limit 1
    ) p on true
   where m.classe_id = p_classe and m.actif
  on conflict (appel_id, membre_id) do update set statut = excluded.statut, note = excluded.note;
  return v_appel;
end $$;
grant execute on function public.enregistrer_appel(uuid, date, jsonb) to authenticated;

-- ---------- Journal ---------------------------------------------------------
create trigger t_audit after insert or update or delete on public.classes        for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.membres_classe for each row execute function public.auditer();
create trigger t_audit after insert or update or delete on public.appels         for each row execute function public.auditer();
