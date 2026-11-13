-- =====================================================================
--  Données : chaque mosquée qui a des Cheikhs mais aucune classe en cours
--  reçoit une classe « Classe de test » réunissant tous ses Cheikhs actifs
--  et tous ses élèves actifs. Les mosquées qui ont déjà une classe ne changent pas.
--  (Aucun nom ni identifiant réel ici : la règle suffit.)
-- =====================================================================

do $$
declare
  e record;
  v_classe uuid;
begin
  for e in
    select et.id
      from etablissements et
     where not exists (select 1 from classes c where c.etablissement_id = et.id and not c.archivee)
       and exists (select 1 from profils p where p.etablissement_id = et.id and p.role = 'maitre' and p.actif)
  loop
    insert into classes (etablissement_id, nom) values (e.id, 'Classe de test') returning id into v_classe;

    insert into classes_cheikhs (classe_id, maitre_id)
    select v_classe, p.id from profils p
     where p.etablissement_id = e.id and p.role = 'maitre' and p.actif;

    insert into membres_classe (classe_id, eleve_id)
    select v_classe, p.id from profils p
     where p.etablissement_id = e.id and p.role = 'eleve' and p.actif;
  end loop;
end $$;
