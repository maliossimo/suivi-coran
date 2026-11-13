-- =====================================================================
--  Invitation d'un Cheikh dans une classe : à la création de son compte,
--  il devient Cheikh de la classe choisie par l'admin (métadonnée « classe_id »),
--  si elle est en cours et dans la même mosquée. L'élève, lui, y entre comme avant.
--  Le rôle admin n'est toujours jamais donné ici.
-- =====================================================================

create or replace function public.creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := new.raw_user_meta_data->>'role';
  v_etab uuid := nullif(new.raw_user_meta_data->>'etablissement_id', '')::uuid;
  v_classe uuid;
begin
  insert into profils (id, role, etablissement_id, prenom, nom)
  values (
    new.id,
    case when r = 'maitre' then 'maitre'::role_utilisateur else 'eleve'::role_utilisateur end,
    v_etab,
    left(coalesce(new.raw_user_meta_data->>'prenom', ''), 60),
    left(coalesce(new.raw_user_meta_data->>'nom', ''), 60)
  );

  if coalesce(new.raw_user_meta_data->>'classe_id', '') ~ '^[0-9a-fA-F-]{36}$' then
    v_classe := (new.raw_user_meta_data->>'classe_id')::uuid;
    if r = 'maitre' then
      insert into classes_cheikhs (classe_id, maitre_id)
      select c.id, new.id from classes c
      where c.id = v_classe and c.etablissement_id = v_etab and not c.archivee
      on conflict (classe_id, maitre_id) do nothing;
    else
      insert into membres_classe (classe_id, eleve_id)
      select c.id, new.id from classes c
      where c.id = v_classe and c.etablissement_id = v_etab and not c.archivee
      on conflict (classe_id, eleve_id) do nothing;
    end if;
  end if;
  return new;
end $$;
