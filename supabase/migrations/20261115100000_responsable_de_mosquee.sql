-- =====================================================================
--  Responsable de mosquée : une casquette en plus, donnée par l'administrateur à un compte
--  (en général un Cheikh). Dans SA mosquée seulement, il organise les classes, invite des
--  Cheikhs et des élèves, les place dans les classes, et suit tous les élèves comme leur Cheikh.
--  Il ne voit ni les autres mosquées, ni le journal d'audit, ni l'état du site.
-- =====================================================================

alter table public.profils add column responsable boolean not null default false;

-- Seul l'administrateur nomme (ou retire) un responsable.
create or replace function public.proteger_profil() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not est_admin() then
    if new.role is distinct from old.role
       or new.etablissement_id is distinct from old.etablissement_id
       or new.responsable is distinct from old.responsable then
      raise exception 'Modification réservée à l''administrateur' using errcode = 'insufficient_privilege';
    end if;
    -- un maître (ou le responsable de la mosquée) peut (dés)activer ses élèves, pas lui-même
    if new.actif is distinct from old.actif and not est_maitre_de(old.id) then
      raise exception 'Modification réservée à l''administrateur' using errcode = 'insufficient_privilege';
    end if;
  end if;
  if new.lecture is distinct from old.lecture
     and coalesce(current_setting('app.conversion_lecture', true), '') <> 'oui' then
    raise exception 'La lecture se change avec changer_lecture' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

-- Responsable d'une mosquée : l'ancien rôle « responsable » (présences seulement) ou un Cheikh
-- qui porte la casquette.
create or replace function public.est_responsable_de(p_etablissement uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profils
     where id = auth.uid() and actif and etablissement_id = p_etablissement
       and (role = 'responsable' or (role = 'maitre' and responsable))
  );
$$;

-- Un élève de la mosquée dont la personne connectée est le Cheikh responsable : elle le suit
-- comme son Cheikh (fiche, séances, commentaires, archivage).
create or replace function public.est_responsable_de_eleve(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from profils r
      join profils e on e.etablissement_id = r.etablissement_id
     where r.id = auth.uid() and r.actif and r.role = 'maitre' and r.responsable
       and e.id = p_eleve and e.role = 'eleve'
  );
$$;
revoke all on function public.est_responsable_de_eleve(uuid) from public, anon;
grant execute on function public.est_responsable_de_eleve(uuid) to authenticated;

-- Cheikh d'un élève : celui de ses classes (ou de sa mosquée s'il n'a pas de classe), comme avant,
-- ou le Cheikh responsable de sa mosquée.
create or replace function public.est_maitre_de(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select est_responsable_de_eleve(p_eleve) or exists (
    select 1
    from profils m
    join profils e on e.etablissement_id = m.etablissement_id
    where m.id = auth.uid() and m.role = 'maitre' and m.actif
      and e.id = p_eleve and e.role = 'eleve'
      and (
        exists (
          select 1
          from membres_classe mc
          join classes c on c.id = mc.classe_id and not c.archivee
          join classes_cheikhs cc on cc.classe_id = c.id and cc.maitre_id = m.id
          where mc.eleve_id = e.id and mc.actif
        )
        or not exists (
          select 1
          from membres_classe mc
          join classes c on c.id = mc.classe_id and not c.archivee
          where mc.eleve_id = e.id and mc.actif
            and exists (select 1 from classes_cheikhs cc2 where cc2.classe_id = c.id)
        )
      )
  );
$$;
