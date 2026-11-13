-- =====================================================================
--  Présences : organisation des droits et statuts simplifiés.
--
--  - Statuts : présent ou absent seulement (retard → présent, excusé → absent).
--  - Qui fait quoi :
--      admin        : tout ;
--      responsable  : voit les présences de sa mosquée, crée et organise les classes
--                     (nom, jours, Cheikhs, élèves), ne fait pas l'appel ;
--      Cheikh       : voit ses classes, fait l'appel, ajoute ou retire des élèves
--                     de ses classes, ne crée pas de classe.
-- =====================================================================

-- ---------- Statuts : présent / absent -------------------------------------
update public.presences set statut = 'present' where statut = 'retard';
update public.presences set statut = 'absent' where statut = 'excuse';
alter table public.presences
  add constraint presences_present_ou_absent check (statut in ('present', 'absent'));

-- ---------- Fonctions de droits --------------------------------------------
/** Responsable de cette mosquée (compte actif). */
create or replace function public.est_responsable_de(p_etablissement uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profils
     where id = auth.uid() and actif and role = 'responsable' and etablissement_id = p_etablissement
  );
$$;

/** Faire l'appel : l'admin, ou un Cheikh actif de la classe (inchangé, rappelé pour la lisibilité). */
create or replace function public.peut_faire_appel(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select peut_gerer_classe(p_classe);
$$;

/** Organiser la classe (nom, jours, Cheikhs) : l'admin ou le responsable de sa mosquée. */
create or replace function public.peut_organiser_classe(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select est_admin() or exists (
    select 1 from classes c where c.id = p_classe and est_responsable_de(c.etablissement_id)
  );
$$;

/** Élèves de la classe : le responsable et les Cheikhs de la classe. */
create or replace function public.peut_gerer_membres(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select peut_organiser_classe(p_classe) or peut_gerer_classe(p_classe);
$$;

create or replace function public.peut_voir_classe(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select peut_gerer_classe(p_classe) or peut_organiser_classe(p_classe);
$$;

-- ---------- Politiques --------------------------------------------------------
drop policy classes_creation on public.classes;
drop policy classes_modification on public.classes;
create policy classes_creation on public.classes for insert to authenticated
  with check (est_admin() or est_responsable_de(etablissement_id));
create policy classes_modification on public.classes for update to authenticated
  using (peut_organiser_classe(id)) with check (peut_organiser_classe(id));

drop policy cheikhs_ajout on public.classes_cheikhs;
drop policy cheikhs_retrait on public.classes_cheikhs;
create policy cheikhs_ajout on public.classes_cheikhs for insert to authenticated
  with check (
    peut_organiser_classe(classe_id) and exists (
      select 1 from profils m join classes c on c.id = classe_id
       where m.id = maitre_id and m.role = 'maitre' and m.etablissement_id = c.etablissement_id
    )
  );
create policy cheikhs_retrait on public.classes_cheikhs for delete to authenticated
  using (peut_organiser_classe(classe_id));

drop policy membres_ajout on public.membres_classe;
drop policy membres_modification on public.membres_classe;
drop policy membres_suppression on public.membres_classe;
create policy membres_ajout on public.membres_classe for insert to authenticated
  with check (peut_gerer_membres(classe_id));
create policy membres_modification on public.membres_classe for update to authenticated
  using (peut_gerer_membres(classe_id)) with check (peut_gerer_membres(classe_id));
create policy membres_suppression on public.membres_classe for delete to authenticated
  using (peut_organiser_classe(classe_id));

-- Le responsable voit les noms des personnes de sa mosquée (élèves et Cheikhs),
-- pour composer les classes ; rien du suivi du Coran (séances, passages…).
create policy profil_lecture_responsable on public.profils for select to authenticated
  using (est_responsable_de(etablissement_id));
