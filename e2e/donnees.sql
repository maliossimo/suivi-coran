-- =====================================================================
--  Jeu de données des tests de bout en bout (base Supabase jetable du CI).
--  Comptes FICTIFS (domaine .test), mot de passe de test commun : ils n'existent
--  que le temps du test, jamais dans la vraie base.
-- =====================================================================
begin;

insert into public.etablissements (id, nom) values
  ('e2e00000-0000-0000-0000-00000000000a', 'Mosquée A (test)'),
  ('e2e00000-0000-0000-0000-00000000000b', 'Mosquée B (test)');

-- Comptes : la fonction crée l'utilisateur d'authentification et son identité « e-mail ».
create function pg_temp.compte(p_id uuid, p_email text, p_meta jsonb) returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Essai-bout-en-bout-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', p_meta, now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, jsonb_build_object('sub', p_id::text, 'email', p_email), 'email', now(), now(), now());
end $$;

select pg_temp.compte('e2e00000-0000-0000-0000-0000000000ad', 'admin@bout-en-bout.test',
  '{"prenom":"Admin","nom":"Essai"}');
select pg_temp.compte('e2e00000-0000-0000-0000-0000000000c1', 'cheikh.a@bout-en-bout.test',
  '{"role":"maitre","etablissement_id":"e2e00000-0000-0000-0000-00000000000a","prenom":"Cheikh","nom":"Alpha"}');
select pg_temp.compte('e2e00000-0000-0000-0000-0000000000c2', 'cheikh.b@bout-en-bout.test',
  '{"role":"maitre","etablissement_id":"e2e00000-0000-0000-0000-00000000000b","prenom":"Cheikh","nom":"Bêta"}');
select pg_temp.compte('e2e00000-0000-0000-0000-0000000000e1', 'eleve.a@bout-en-bout.test',
  '{"etablissement_id":"e2e00000-0000-0000-0000-00000000000a","prenom":"Inès","nom":"Essai"}');
select pg_temp.compte('e2e00000-0000-0000-0000-0000000000e2', 'eleve.b@bout-en-bout.test',
  '{"etablissement_id":"e2e00000-0000-0000-0000-00000000000b","prenom":"Bilal","nom":"Autre"}');

-- Rôle admin et lecture des élèves : réglés « à la console », comme en vrai.
update public.profils set role = 'admin', etablissement_id = null
  where id = 'e2e00000-0000-0000-0000-0000000000ad';
-- (comme changer_lecture : autorise le changement de lecture pour cette transaction)
select set_config('app.conversion_lecture', 'oui', true);
update public.profils set lecture = 'hafs'
  where id in ('e2e00000-0000-0000-0000-0000000000e1', 'e2e00000-0000-0000-0000-0000000000e2');

-- Une séance de révision d'hier, à corriger par le Cheikh.
insert into public.seances (id, eleve_id, date, type, duree_min) values
  ('e2e00000-0000-0000-0000-0000000005e1', 'e2e00000-0000-0000-0000-0000000000e1',
   (now() at time zone 'Europe/Paris')::date - 1, 'revision', 20);
insert into public.passages (seance_id, sourate_debut, verset_debut, sourate_fin, verset_fin) values
  ('e2e00000-0000-0000-0000-0000000005e1', 67, 1, 67, 10);

-- Présences : une classe de la mosquée A, cours tous les jours (l'appel du jour est possible).
insert into public.classes (id, etablissement_id, nom, jours) values
  ('e2e00000-0000-0000-0000-0000000c1a55', 'e2e00000-0000-0000-0000-00000000000a', 'Coran (test)',
   array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
insert into public.classes_cheikhs (classe_id, maitre_id) values
  ('e2e00000-0000-0000-0000-0000000c1a55', 'e2e00000-0000-0000-0000-0000000000c1');
insert into public.membres_classe (classe_id, eleve_id) values
  ('e2e00000-0000-0000-0000-0000000c1a55', 'e2e00000-0000-0000-0000-0000000000e1');
insert into public.membres_classe (classe_id, prenom, nom) values
  ('e2e00000-0000-0000-0000-0000000c1a55', 'Yanis', 'Sanscompte');

commit;
