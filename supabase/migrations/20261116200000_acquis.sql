-- =====================================================================
--  « Ce que je connais déjà » : les parties du Coran que l'élève savait par cœur
--  en arrivant (déclarées par lui, une seule fois puis modifiables).
--  - Elles s'ajoutent à ses séances : rien de ce qui existe n'est modifié.
--  - Pour chaque partie, l'élève décide s'il veut la faire écouter à son Cheikh
--    (a_ecouter). Seul un encadrant (Cheikh, admin) peut la marquer écoutée ou validée.
--  - Versets dans la numérotation de la lecture de l'élève (Hafs ou Warsh), convertis
--    avec ses séances quand il change de lecture.
-- =====================================================================

create table public.acquis (
  id            uuid primary key default gen_random_uuid(),
  eleve_id      uuid not null references public.profils(id) on delete cascade,
  sourate_debut smallint not null check (sourate_debut between 1 and 114),
  verset_debut  smallint not null check (verset_debut >= 1),
  sourate_fin   smallint not null check (sourate_fin between 1 and 114),
  verset_fin    smallint not null check (verset_fin >= 1),
  -- L'élève veut que son Cheikh l'écoute (sinon : connue, sans rien demander).
  a_ecouter     boolean not null default false,
  ecoute_par    uuid references public.profils(id) on delete set null,
  ecoute_le     timestamptz,
  valide_le     timestamptz,
  cree_le       timestamptz not null default now(),
  check (sourate_debut < sourate_fin or (sourate_debut = sourate_fin and verset_debut <= verset_fin))
);
create index acquis_eleve on public.acquis (eleve_id);
create index acquis_a_ecouter on public.acquis (eleve_id) where a_ecouter and ecoute_le is null;

-- L'élève a répondu à « Ce que tu connais déjà » (rempli, « rien » ou « plus tard ») : on ne le redemande plus.
alter table public.profils add column acquis_repondu boolean not null default false;

-- ---------- Versets dans les bornes de la sourate (lecture de l'élève) ----------
create or replace function public.verifier_versets_acquis() returns trigger
language plpgsql set search_path = public as $$
declare
  v_lecture lecture := lecture_de(new.eleve_id);
begin
  if new.verset_debut > nb_versets_de(new.sourate_debut, v_lecture)
  or new.verset_fin   > nb_versets_de(new.sourate_fin, v_lecture) then
    raise exception 'Verset hors de la sourate' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_verifier_versets before insert or update on public.acquis
  for each row execute function public.verifier_versets_acquis();

-- ---------- L'écoute n'est marquée que par un encadrant, en son nom ----------
create or replace function public.proteger_acquis() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.eleve_id is distinct from old.eleve_id then
    raise exception 'Élève non modifiable' using errcode = 'insufficient_privilege';
  end if;
  if auth.uid() is null then
    return new; -- console, conversion de lecture
  end if;
  if not encadre(new.eleve_id) then
    -- L'élève : il déclare et choisit a_ecouter, il ne marque pas l'écoute.
    if tg_op = 'INSERT' then
      new.ecoute_par := null; new.ecoute_le := null; new.valide_le := null;
    else
      new.ecoute_par := old.ecoute_par; new.ecoute_le := old.ecoute_le; new.valide_le := old.valide_le;
    end if;
  elsif tg_op = 'UPDATE' and (new.ecoute_le is distinct from old.ecoute_le
                              or new.valide_le is distinct from old.valide_le) then
    -- L'encadrant signe ce qu'il marque.
    new.ecoute_par := case when new.ecoute_le is null and new.valide_le is null then null else auth.uid() end;
  end if;
  return new;
end $$;
create trigger t_proteger before insert or update on public.acquis
  for each row execute function public.proteger_acquis();

create trigger t_audit after insert or update or delete on public.acquis
  for each row execute function public.auditer();

-- ---------- Règles d'accès : comme les séances ----------
alter table public.acquis enable row level security;
create policy acquis_acces on public.acquis for all to authenticated
  using (peut_acceder(eleve_id)) with check (peut_acceder(eleve_id));

-- ---------- L'élève a répondu (il ne modifie que ce drapeau, pour lui-même) ----------
create or replace function public.acquis_repondu() returns void
language sql security definer set search_path = public as $$
  update profils set acquis_repondu = true where id = auth.uid() and role = 'eleve';
$$;
revoke all on function public.acquis_repondu() from public, anon;
grant execute on function public.acquis_repondu() to authenticated;

-- ---------- Le Cheikh marque une partie : « ecoute », « valide » ou « aucun » ----------
create or replace function public.marquer_acquis(p_id uuid, p_etat text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if p_etat not in ('aucun', 'ecoute', 'valide') then
    raise exception 'État inconnu' using errcode = 'invalid_parameter_value';
  end if;
  update acquis
     set ecoute_le = case p_etat when 'aucun' then null else coalesce(ecoute_le, now()) end,
         valide_le = case p_etat when 'valide' then coalesce(valide_le, now()) else null end
   where id = p_id and encadre(eleve_id);
  if not found then
    raise exception 'Partie introuvable' using errcode = 'insufficient_privilege';
  end if;
end $$;
revoke all on function public.marquer_acquis(uuid, text) from public, anon;
grant execute on function public.marquer_acquis(uuid, text) to authenticated;

-- ---------- Changement de lecture : les acquis sont convertis avec les séances ----------
create or replace function public.changer_lecture(p_eleve uuid, p_lecture public.lecture) returns void
language plpgsql
security invoker            -- les droits restent ceux des règles d'accès (RLS)
set search_path = public
as $$
declare
  v_avant lecture;
begin
  if p_lecture is null then
    raise exception 'Lecture manquante' using errcode = 'invalid_parameter_value';
  end if;
  if not exists (select 1 from profils where id = p_eleve and role = 'eleve') or not peut_acceder(p_eleve) then
    raise exception 'Élève introuvable' using errcode = 'insufficient_privilege';
  end if;
  v_avant := lecture_de(p_eleve);
  perform set_config('app.conversion_lecture', 'oui', true);

  update profils set lecture = p_lecture where id = p_eleve;
  if not found then
    raise exception 'Élève introuvable' using errcode = 'insufficient_privilege';
  end if;

  if v_avant <> p_lecture then
    update passages p
       set verset_debut = convertir_verset(p.sourate_debut, p.verset_debut, p_lecture, true),
           verset_fin   = convertir_verset(p.sourate_fin, p.verset_fin, p_lecture, false)
      from seances s
     where s.id = p.seance_id and s.eleve_id = p_eleve;
    update acquis a
       set verset_debut = convertir_verset(a.sourate_debut, a.verset_debut, p_lecture, true),
           verset_fin   = convertir_verset(a.sourate_fin, a.verset_fin, p_lecture, false)
     where a.eleve_id = p_eleve;
  end if;

  perform set_config('app.conversion_lecture', '', true);
end $$;
revoke all on function public.changer_lecture(uuid, public.lecture) from public, anon;
grant execute on function public.changer_lecture(uuid, public.lecture) to authenticated;
