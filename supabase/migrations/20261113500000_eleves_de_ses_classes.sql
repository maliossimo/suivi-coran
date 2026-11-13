-- =====================================================================
--  Suivi du Coran : chaque Cheikh ne voit que les élèves de SES classes.
--
--  Avant : un maître voyait tous les élèves de son établissement.
--  Maintenant : un maître voit un élève de son établissement si
--    - l'élève est membre (actif) d'une classe non terminée dont il est Cheikh ;
--    - ou l'élève n'est dans aucune classe (cas transitoire : il reste visible
--      par les Cheikhs de sa mosquée jusqu'à ce qu'on le place dans une classe).
--
--  est_maitre_de() est la règle unique utilisée par peut_acceder() / encadre()
--  et par les politiques des profils : séances, passages, commentaires,
--  objectifs et bilans suivent automatiquement.
-- =====================================================================

create or replace function public.est_maitre_de(p_eleve uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
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
        )
      )
  );
$$;

-- Accélère les deux sous-requêtes ci-dessus.
create index if not exists membres_classe_eleve_actif on public.membres_classe (eleve_id) where actif;

-- ---------------------------------------------------------------------
--  Un élève invité par un Cheikh rejoint directement sa classe.
-- ---------------------------------------------------------------------

-- QR code : la classe visée (facultative), de l'établissement du code.
alter table public.invitations_classe
  add column classe_id uuid references public.classes (id) on delete set null;

create or replace function public.verifier_classe_invitation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.classe_id is not null and not exists (
    select 1 from classes c
    where c.id = new.classe_id and c.etablissement_id = new.etablissement_id and not c.archivee
  ) then
    raise exception 'Classe hors de l''établissement du code' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger t_verifier_classe before insert or update of classe_id, etablissement_id
  on public.invitations_classe for each row execute function public.verifier_classe_invitation();

-- Création du profil : si l'invitation précise une classe (métadonnée « classe_id »)
-- de la même mosquée, l'élève y est ajouté. Le rôle admin n'est toujours jamais donné ici.
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

  if coalesce(r, 'eleve') <> 'maitre'
     and coalesce(new.raw_user_meta_data->>'classe_id', '') ~ '^[0-9a-fA-F-]{36}$' then
    v_classe := (new.raw_user_meta_data->>'classe_id')::uuid;
    insert into membres_classe (classe_id, eleve_id)
    select c.id, new.id from classes c
    where c.id = v_classe and c.etablissement_id = v_etab and not c.archivee
    on conflict (classe_id, eleve_id) do nothing;
  end if;
  return new;
end $$;
