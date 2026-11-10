-- =====================================================================
--  Tests des règles d'accès (RLS) et des contraintes métier.
--  Lancés en CI sur un Supabase local : `npm run test:db`.
--  Tout se passe dans une transaction annulée à la fin : aucune trace.
--  Le moindre échec lève une exception → code de sortie non nul.
-- =====================================================================
begin;

-- ---------- Outils de test -------------------------------------------
create function pg_temp.en_tant_que(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.console() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.attendu(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ÉCHEC : %', msg; end if;
  raise notice 'ok — %', msg;
end $$;

-- Exécute une requête qui DOIT échouer
create function pg_temp.doit_echouer(q text, msg text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    raise notice 'ok — % (refusé : %)', msg, sqlerrm;
    return;
  end;
  raise exception 'ÉCHEC : % (accepté alors qu''il devait être refusé)', msg;
end $$;

grant execute on function pg_temp.en_tant_que(uuid), pg_temp.console(), pg_temp.attendu(boolean, text),
  pg_temp.doit_echouer(text, text) to authenticated;

-- ---------- Jeu de données -------------------------------------------
-- Établissements A et B ; maître + 2 élèves dans A, maître + 1 élève dans B, 1 admin.
insert into public.etablissements (id, nom) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'École A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'École B');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'maitre.a@test.local', '{"role":"maitre","etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Maître","nom":"A"}'),
  ('a0000000-0000-0000-0000-000000000001', 'eleve1.a@test.local', '{"etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Élève","nom":"Un"}'),
  ('a0000000-0000-0000-0000-000000000002', 'eleve2.a@test.local', '{"etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Élève","nom":"Deux"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'maitre.b@test.local', '{"role":"maitre","etablissement_id":"bbbbbbbb-0000-0000-0000-000000000000","prenom":"Maître","nom":"B"}'),
  ('b0000000-0000-0000-0000-000000000001', 'eleve1.b@test.local', '{"etablissement_id":"bbbbbbbb-0000-0000-0000-000000000000","prenom":"Élève","nom":"B"}'),
  ('ad000000-0000-0000-0000-0000000000ad', 'admin@test.local',    '{"role":"admin","prenom":"Admin","nom":"X"}');

select pg_temp.attendu(
  (select role from public.profils where id = 'ad000000-0000-0000-0000-0000000000ad') = 'eleve',
  'les métadonnées d''invitation ne peuvent pas créer un admin');
update public.profils set role = 'admin' where id = 'ad000000-0000-0000-0000-0000000000ad';  -- console SQL

insert into public.seances (id, eleve_id, date, type, duree_min, tajwid) values
  ('5e000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000001', '2026-11-09', 'revision', 30, 'Noun sakin'),
  ('5e000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-000000000002', '2026-11-09', 'revision', 20, null),
  ('5e000000-0000-0000-0000-0000000000b1', 'b0000000-0000-0000-0000-000000000001', '2026-11-09', 'apprentissage', 25, null);
insert into public.passages (seance_id, sourate_debut, verset_debut, sourate_fin, verset_fin) values
  ('5e000000-0000-0000-0000-0000000000a1', 67, 1, 67, 15);

-- ---------- Élève 1 (école A) ----------------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu((select count(*) from public.seances) = 1, 'élève : ne voit que ses séances');
select pg_temp.attendu((select count(*) from public.profils) = 1, 'élève : ne voit que son profil');
select pg_temp.attendu((select count(*) from public.journal_audit) = 0, 'élève : pas d''accès au journal');
select pg_temp.attendu((select count(*) from public.sourates) = 114, 'élève : lit les 114 sourates');

insert into public.seances (eleve_id, date, type, duree_min) values
  ('a0000000-0000-0000-0000-000000000001', '2026-11-10', 'apprentissage', 15);
select pg_temp.attendu(true, 'élève : saisit sa propre séance');

select pg_temp.doit_echouer(
  $q$insert into public.seances (eleve_id, date, type, duree_min) values ('a0000000-0000-0000-0000-000000000002', '2026-11-10', 'revision', 10)$q$,
  'élève : ne peut pas écrire pour un autre élève');
select pg_temp.doit_echouer(
  $q$update public.profils set role = 'maitre' where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  'élève : ne peut pas changer son rôle');
select pg_temp.doit_echouer(
  $q$insert into public.commentaires (eleve_id, auteur_id, seance_id, texte) values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-0000000000a1', 'x')$q$,
  'élève : ne peut pas écrire de commentaire');
select pg_temp.doit_echouer(
  $q$insert into public.passages (seance_id, sourate_debut, verset_debut, sourate_fin, verset_fin) values ('5e000000-0000-0000-0000-0000000000a1', 67, 1, 67, 31)$q$,
  'verset hors de la sourate refusé');
select pg_temp.doit_echouer(
  $q$insert into public.seances (eleve_id, date, type, duree_min) values ('a0000000-0000-0000-0000-000000000001', '2099-01-01', 'revision', 10)$q$,
  'date dans le futur refusée');
select pg_temp.doit_echouer(
  $q$insert into public.seances (eleve_id, date, type, duree_min) values ('a0000000-0000-0000-0000-000000000001', '2026-11-09', 'revision', 10)$q$,
  'une seule séance par jour et par type');

delete from public.seances where eleve_id = 'a0000000-0000-0000-0000-000000000001' and date = '2026-11-10';
select pg_temp.attendu(true, 'élève : supprime sa propre séance');

-- ---------- Maître A -------------------------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.attendu((select count(*) from public.seances) = 2, 'maître A : voit les séances de ses 2 élèves, pas celles de B');
select pg_temp.attendu((select count(*) from public.profils where role = 'eleve') = 2, 'maître A : voit ses 2 élèves');

update public.passages set verset_fin = 20 where seance_id = '5e000000-0000-0000-0000-0000000000a1';
select pg_temp.attendu(
  (select modifiee_par from public.seances where id = '5e000000-0000-0000-0000-0000000000a1') = 'a0000000-0000-0000-0000-00000000000a',
  'maître A : sa correction est tracée sur la séance');

insert into public.commentaires (eleve_id, auteur_id, seance_id, texte) values
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '5e000000-0000-0000-0000-0000000000a1', 'Bien, revois le verset 16.');
select pg_temp.attendu(true, 'maître A : commente un de ses élèves');

select pg_temp.doit_echouer(
  $q$insert into public.commentaires (eleve_id, auteur_id, seance_id, texte) values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '5e000000-0000-0000-0000-0000000000b1', 'x')$q$,
  'maître A : ne peut pas commenter un élève de B');
update public.seances set duree_min = 99 where id = '5e000000-0000-0000-0000-0000000000b1';
select pg_temp.console();
select pg_temp.attendu(
  (select duree_min from public.seances where id = '5e000000-0000-0000-0000-0000000000b1') = 25,
  'maître A : ne peut pas modifier une séance de B');

-- ---------- Élève 1 voit le commentaire ------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu((select count(*) from public.commentaires) = 1, 'élève : lit le commentaire de son maître');

-- ---------- Élève désactivé ------------------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
update public.profils set actif = false where id = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000002');
select pg_temp.attendu((select count(*) from public.seances) = 0, 'élève désactivé : n''accède plus à rien');

-- ---------- Admin ----------------------------------------------------
select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
select pg_temp.attendu((select count(*) from public.seances) = 3, 'admin : voit toutes les séances');
select pg_temp.attendu((select count(*) from public.etablissements) = 2, 'admin : voit tous les établissements');
select pg_temp.attendu((select count(*) from public.journal_audit) > 0, 'admin : lit le journal d''audit');
select pg_temp.attendu(
  exists (select 1 from public.journal_audit where table_nom = 'passages' and action = 'UPDATE'
          and acteur_id = 'a0000000-0000-0000-0000-00000000000a'),
  'journal : la correction du maître est enregistrée');
select pg_temp.doit_echouer($q$delete from public.journal_audit$q$, 'journal : personne ne peut l''effacer, même l''admin');

select pg_temp.console();
rollback;
