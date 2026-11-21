-- =====================================================================
--  Suivi du Coran : un Cheikh ne voit plus les élèves sans classe.
--
--  Avant : un élève sans classe (ou dont la classe n'avait pas de Cheikh) restait visible par tous les
--  Cheikhs de sa mosquée « jusqu'à ce qu'on le place ». Résultat : un compte de test ou un nouvel
--  arrivant apparaissait chez des Cheikhs qui ne le suivent pas.
--
--  Maintenant, un Cheikh voit un élève de son établissement seulement si l'élève est membre actif d'une
--  classe non terminée dont il est Cheikh. Restent inchangés : le Cheikh responsable de la mosquée voit
--  tous les élèves de sa mosquée (c'est lui qui place les nouveaux dans une classe), et l'admin voit tout.
-- =====================================================================

create or replace function public.est_maitre_de(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select est_responsable_de_eleve(p_eleve) or exists (
    select 1
    from profils m
    join profils e on e.etablissement_id = m.etablissement_id
    join membres_classe mc on mc.eleve_id = e.id and mc.actif
    join classes c on c.id = mc.classe_id and not c.archivee
    join classes_cheikhs cc on cc.classe_id = c.id and cc.maitre_id = m.id
    where m.id = auth.uid() and m.role = 'maitre' and m.actif
      and e.id = p_eleve and e.role = 'eleve'
  );
$$;
