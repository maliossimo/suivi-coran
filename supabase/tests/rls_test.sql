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

-- ---------- enregistrer_seance (séance + passages, atomique) ----------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select public.enregistrer_seance('2026-11-02', 'apprentissage', 20::smallint, 'Noun sakin', 'Difficile',
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10},
    {"sourateDebut":78,"versetDebut":1,"sourateFin":78,"versetFin":5}]'::jsonb);
select pg_temp.attendu(
  (select count(*) from public.passages p join public.seances s on s.id = p.seance_id
   where s.date = '2026-11-02' and s.type = 'apprentissage') = 2,
  'enregistrer_seance : crée la séance et ses 2 passages');

select public.enregistrer_seance('2026-11-02', 'apprentissage', 35::smallint, '', null,
  '[{"sourateDebut":67,"versetDebut":11,"sourateFin":67,"versetFin":20}]'::jsonb);
select pg_temp.attendu(
  (select duree_min = 35 and tajwid is null from public.seances where date = '2026-11-02' and type = 'apprentissage')
  and (select count(*) from public.passages p join public.seances s on s.id = p.seance_id
       where s.date = '2026-11-02' and s.type = 'apprentissage') = 1,
  'enregistrer_seance : met à jour et remplace les passages');

select pg_temp.doit_echouer(
  $q$select public.enregistrer_seance('2026-11-02', 'revision', 10::smallint, null, null, '[]'::jsonb, 'a0000000-0000-0000-0000-000000000002')$q$,
  'enregistrer_seance : un élève ne peut pas enregistrer pour un autre');
select pg_temp.doit_echouer(
  $q$select public.enregistrer_seance('2026-11-03', 'revision', 10::smallint, null, null, '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":99}]'::jsonb)$q$,
  'enregistrer_seance : verset hors sourate refusé, rien n''est enregistré');
select pg_temp.attendu(
  not exists (select 1 from public.seances where date = '2026-11-03' and eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'enregistrer_seance : en cas d''erreur, la séance n''est pas créée (transaction)');

-- ---------- Correction par passage ------------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select public.enregistrer_seance('2026-11-04', 'apprentissage', 15::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10}]'::jsonb);
select pg_temp.attendu(
  (select corrige_par is null from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-04' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'correction : un passage saisi par l''élève n''est pas encore vu');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.enregistrer_seance('2026-11-04', 'apprentissage', 15::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10}]'::jsonb,
  'a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu(
  (select corrige_par = 'a0000000-0000-0000-0000-00000000000a'
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-04' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'correction : le Cheikh qui enregistre marque le passage comme vu');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select public.enregistrer_seance('2026-11-04', 'apprentissage', 20::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10},
    {"sourateDebut":67,"versetDebut":11,"sourateFin":67,"versetFin":15}]'::jsonb);
select pg_temp.attendu(
  (select count(*) filter (where corrige_par is not null) = 1 and count(*) = 2
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-04' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'correction : un passage ajouté après coup n''est pas vu, l''ancien garde sa marque');

update public.passages set corrige_par = 'a0000000-0000-0000-0000-000000000001', corrige_le = now()
 where seance_id = (select id from public.seances where date = '2026-11-04'
                      and eleve_id = 'a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu(
  (select count(*) filter (where corrige_par is not null) = 1
     and bool_and(corrige_par is distinct from 'a0000000-0000-0000-0000-000000000001')
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-04' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'correction : l''élève ne peut pas se marquer lui-même comme corrigé');

select public.enregistrer_seance('2026-11-04', 'apprentissage', 20::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":12},
    {"sourateDebut":67,"versetDebut":13,"sourateFin":67,"versetFin":15}]'::jsonb);
select pg_temp.attendu(
  (select count(*) filter (where corrige_par is not null) = 0
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-04' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'correction : un passage modifié par l''élève n''est plus marqué vu');

select pg_temp.doit_echouer(
  $q$select public.enregistrer_seance('2026-11-05', 'apprentissage', 10::smallint, null, null,
    '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10},
      {"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10}]'::jsonb)$q$,
  'doublon : le même passage deux fois dans une séance est refusé');
select pg_temp.doit_echouer(
  $q$select public.enregistrer_seance('2026-11-05', 'apprentissage', 10::smallint, null, null,
    '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10},
      {"sourateDebut":67,"versetDebut":8,"sourateFin":68,"versetFin":2}]'::jsonb)$q$,
  'doublon : deux passages qui se chevauchent sont refusés');
select public.enregistrer_seance('2026-11-05', 'apprentissage', 10::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10},
    {"sourateDebut":67,"versetDebut":11,"sourateFin":67,"versetFin":20}]'::jsonb);
select pg_temp.attendu(
  (select count(*) = 2 from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-05' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'doublon : deux passages qui se suivent sont acceptés');

-- Validation en un geste
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select public.enregistrer_seance('2026-11-06', 'revision', 10::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":10},
    {"sourateDebut":68,"versetDebut":1,"sourateFin":68,"versetFin":5}]'::jsonb);
select pg_temp.doit_echouer(
  $q$select public.valider_seance((select id from public.seances where date = '2026-11-06'
       and eleve_id = 'a0000000-0000-0000-0000-000000000001'))$q$,
  'validation : l''élève ne peut pas valider sa propre séance');
select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.doit_echouer(
  $q$select public.valider_seance('5e000000-0000-0000-0000-0000000000a1')$q$,
  'validation : refusée au Cheikh d''une autre école');
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.valider_seance((select id from public.seances where date = '2026-11-06'
  and eleve_id = 'a0000000-0000-0000-0000-000000000001'));
select pg_temp.attendu(
  (select count(*) filter (where p.corrige_par = 'a0000000-0000-0000-0000-00000000000a') = 2
      and bool_and(s.modifiee_par = 'a0000000-0000-0000-0000-00000000000a') and bool_and(s.duree_min = 10)
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-06' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'validation : le Cheikh valide en un geste, tous les passages sont vus, rien d''autre ne change');

-- Le Cheikh revoit la séance du 4 : tous ses passages sont marqués.
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.enregistrer_seance('2026-11-04', 'apprentissage', 20::smallint, null, null,
  '[{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":12},
    {"sourateDebut":67,"versetDebut":13,"sourateFin":67,"versetFin":15}]'::jsonb,
  'a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu(
  (select count(*) filter (where corrige_par is not null) = 2
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.date = '2026-11-04' and s.eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'correction : le Cheikh qui réenregistre sans rien changer marque tous les passages');

-- ---------- Invitations par QR code -----------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
insert into public.invitations_classe (id, etablissement_id, cree_par, code, expire_le) values
  ('1c000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000',
   'a0000000-0000-0000-0000-00000000000a', 'code-de-test-ecole-a-0001', now() + interval '7 days');
select pg_temp.attendu((select count(*) from public.invitations_classe) = 1,
  'QR : le maître crée et voit le code de sa classe');
select pg_temp.doit_echouer(
  $q$insert into public.invitations_classe (etablissement_id, cree_par, code, expire_le) values ('bbbbbbbb-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', 'code-de-test-ecole-b-0001', now() + interval '7 days')$q$,
  'QR : un maître ne crée pas de code pour une autre école');
update public.invitations_classe set actif = false where id = '1c000000-0000-0000-0000-0000000000a1';
select pg_temp.attendu(
  (select not actif from public.invitations_classe where id = '1c000000-0000-0000-0000-0000000000a1'),
  'QR : le maître désactive son code');

select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.attendu((select count(*) from public.invitations_classe) = 0,
  'QR : invisible pour le maître d''une autre école');
update public.invitations_classe set actif = true where id = '1c000000-0000-0000-0000-0000000000a1';
select pg_temp.console();
select pg_temp.attendu(
  (select not actif from public.invitations_classe where id = '1c000000-0000-0000-0000-0000000000a1'),
  'QR : un autre maître ne peut pas réactiver le code');

select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
insert into public.invitations_classe (etablissement_id, cree_par, code, expire_le) values
  ('bbbbbbbb-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-0000000000ad', 'code-admin-ecole-b-00001', now() + interval '7 days');
select pg_temp.attendu((select count(*) from public.invitations_classe) = 2,
  'QR : l''admin crée un code pour n''importe quelle école et voit tous les codes');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu((select count(*) from public.invitations_classe) = 0,
  'QR : un élève ne voit pas les codes');
select pg_temp.doit_echouer(
  $q$insert into public.invitations_classe (etablissement_id, cree_par, code, expire_le) values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'code-de-test-eleve-00001', now() + interval '7 days')$q$,
  'QR : un élève ne crée pas de code');

select pg_temp.console();

-- ---------- Bilan du mois ---------------------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
insert into public.bilans_mensuels (id, eleve_id, type, mois, bien_memorise, a_renforcer) values
  ('b1000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000001', 'apprentissage',
   '2026-11-01', 'Al-Mulk 1-15', 'Les madd');
select pg_temp.attendu(
  (select modifie_par is null from public.bilans_mensuels where id = 'b1000000-0000-0000-0000-0000000000a1'),
  'bilan : l''élève écrit son propre bilan');
select pg_temp.doit_echouer(
  $q$insert into public.bilans_mensuels (eleve_id, type, mois, bien_memorise) values ('a0000000-0000-0000-0000-000000000001', 'apprentissage', '2026-11-01', 'doublon')$q$,
  'bilan : un seul bilan par élève, par mois et par type');
select pg_temp.doit_echouer(
  $q$insert into public.bilans_mensuels (eleve_id, type, mois, bien_memorise) values ('b0000000-0000-0000-0000-000000000001', 'apprentissage', '2026-11-01', 'x')$q$,
  'bilan : un élève ne peut pas écrire le bilan d''un autre');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
update public.bilans_mensuels set a_renforcer = 'Les madd et le idgham'
  where id = 'b1000000-0000-0000-0000-0000000000a1';
select pg_temp.attendu(
  (select modifie_par = 'a0000000-0000-0000-0000-00000000000a' from public.bilans_mensuels
   where id = 'b1000000-0000-0000-0000-0000000000a1'),
  'bilan : le maître complète le bilan, la modification est tracée');
insert into public.commentaires (eleve_id, auteur_id, bilan_id, texte) values
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a',
   'b1000000-0000-0000-0000-0000000000a1', 'Beau mois, continue !');
select pg_temp.attendu(true, 'bilan : le maître commente le bilan');

select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.attendu((select count(*) from public.bilans_mensuels) = 0, 'bilan : invisible pour le maître d''une autre école');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu(
  (select count(*) from public.commentaires where bilan_id is not null) = 1,
  'bilan : l''élève lit le mot de son maître');

-- ---------- Lectures Hafs / Warsh ---------------------------------------
select pg_temp.console();
update public.profils set actif = true where id = 'a0000000-0000-0000-0000-000000000002';  -- réactivé pour ces tests
select pg_temp.attendu(
  (select lecture from public.profils where id = 'a0000000-0000-0000-0000-000000000002') is null,
  'lecture : pas encore choisie à la création du compte');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000002');
select public.enregistrer_seance('2026-11-05', 'apprentissage', 20::smallint, '', null,
  '[{"sourateDebut":1,"versetDebut":2,"sourateFin":1,"versetFin":7},
    {"sourateDebut":2,"versetDebut":280,"sourateFin":2,"versetFin":286}]'::jsonb);
select pg_temp.doit_echouer(
  $q$update public.profils set lecture = 'warsh' where id = 'a0000000-0000-0000-0000-000000000002'$q$,
  'lecture : pas de changement direct (les passages ne seraient pas convertis)');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.doit_echouer(
  $q$select public.changer_lecture('a0000000-0000-0000-0000-000000000002', 'warsh')$q$,
  'lecture : un élève ne change pas celle d''un autre');
select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.doit_echouer(
  $q$select public.changer_lecture('a0000000-0000-0000-0000-000000000002', 'warsh')$q$,
  'lecture : le Cheikh d''une autre école ne la change pas');

-- Le Cheikh A voit les passages ; l'élève passe en Warsh : passages convertis, marque conservée.
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.valider_seance((select id from public.seances
  where eleve_id = 'a0000000-0000-0000-0000-000000000002' and date = '2026-11-05' and type = 'apprentissage'));
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000002');
select public.changer_lecture('a0000000-0000-0000-0000-000000000002', 'warsh');
select pg_temp.attendu(
  (select lecture from public.profils where id = 'a0000000-0000-0000-0000-000000000002') = 'warsh',
  'lecture : l''élève choisit Warsh');
select pg_temp.attendu(
  (select array_agg(format('%s:%s-%s:%s', sourate_debut, verset_debut, sourate_fin, verset_fin) order by ordre)
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.eleve_id = 'a0000000-0000-0000-0000-000000000002' and s.date = '2026-11-05')
  = array['1:1-1:7', '2:279-2:285'],
  'lecture : passages convertis en numérotation Warsh (Fatiha sans basmala, Al-Baqara 285 versets)');
select pg_temp.attendu(
  (select bool_and(corrige_par is not null) from public.passages p join public.seances s on s.id = p.seance_id
    where s.eleve_id = 'a0000000-0000-0000-0000-000000000002' and s.date = '2026-11-05'),
  'lecture : ce que le Cheikh avait vu reste vu après conversion');
select pg_temp.doit_echouer(
  $q$select public.enregistrer_seance('2026-11-06', 'apprentissage', 10::smallint, '', null,
    '[{"sourateDebut":2,"versetDebut":286,"sourateFin":2,"versetFin":286}]'::jsonb)$q$,
  'lecture : en Warsh, Al-Baqara n''a pas de verset 286');
select public.enregistrer_seance('2026-11-06', 'apprentissage', 10::smallint, '', null,
  '[{"sourateDebut":5,"versetDebut":121,"sourateFin":5,"versetFin":122}]'::jsonb);
select pg_temp.attendu(true, 'lecture : en Warsh, Al-Maida va jusqu''au verset 122');

-- Le Cheikh A remet l'élève en Hafs : retour à la numérotation Hafs.
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.changer_lecture('a0000000-0000-0000-0000-000000000002', 'hafs');
select pg_temp.attendu(
  (select array_agg(format('%s:%s-%s:%s', sourate_debut, verset_debut, sourate_fin, verset_fin) order by s.date, ordre)
     from public.passages p join public.seances s on s.id = p.seance_id
    where s.eleve_id = 'a0000000-0000-0000-0000-000000000002' and s.date in ('2026-11-05', '2026-11-06'))
  = array['1:2-1:7', '2:280-2:286', '5:119-5:120'],
  'lecture : le Cheikh la change ; retour en numérotation Hafs');
select pg_temp.console();

-- ---------- Administration : établissements, erreurs, sauvegardes --------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
update public.etablissements set nom = 'Piratée' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
delete from public.etablissements where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.console();
select pg_temp.attendu(
  (select nom from public.etablissements where id = 'aaaaaaaa-0000-0000-0000-000000000000') = 'École A',
  'établissement : un Cheikh ne le renomme ni ne le supprime (rien n''est modifié)');
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.doit_echouer(
  $q$update public.profils set etablissement_id = 'bbbbbbbb-0000-0000-0000-000000000000'
      where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  'déplacement : un Cheikh ne change pas un élève d''établissement');

select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
update public.etablissements set nom = 'École A bis' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.attendu(
  (select nom from public.etablissements where id = 'aaaaaaaa-0000-0000-0000-000000000000') = 'École A bis',
  'établissement : l''admin le renomme');
select pg_temp.doit_echouer(
  $q$delete from public.etablissements where id = 'bbbbbbbb-0000-0000-0000-000000000000'$q$,
  'établissement : pas de suppression tant qu''il a des comptes');
insert into public.etablissements (id, nom) values ('cccccccc-0000-0000-0000-000000000000', 'École vide');
delete from public.etablissements where id = 'cccccccc-0000-0000-0000-000000000000';
select pg_temp.attendu(
  not exists (select 1 from public.etablissements where id = 'cccccccc-0000-0000-0000-000000000000'),
  'établissement : l''admin supprime un établissement vide');
update public.profils set etablissement_id = 'bbbbbbbb-0000-0000-0000-000000000000'
 where id = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.attendu(
  (select etablissement_id from public.profils where id = 'a0000000-0000-0000-0000-000000000002')
    = 'bbbbbbbb-0000-0000-0000-000000000000',
  'déplacement : l''admin change un élève d''établissement');
update public.profils set etablissement_id = 'aaaaaaaa-0000-0000-0000-000000000000'
 where id = 'a0000000-0000-0000-0000-000000000002';

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
insert into public.erreurs (page, message) values ('/eleve', 'Erreur de test');
select pg_temp.doit_echouer(
  $q$insert into public.erreurs (utilisateur_id, page, message)
      values ('a0000000-0000-0000-0000-000000000002', '/eleve', 'au nom d''un autre')$q$,
  'erreurs : on ne signale pas au nom d''un autre');
select pg_temp.attendu((select count(*) from public.erreurs) = 0, 'erreurs : un élève ne les lit pas');
select pg_temp.attendu((select count(*) from public.sauvegardes) = 0, 'sauvegardes : un élève ne les lit pas');
select pg_temp.doit_echouer(
  $q$insert into public.sauvegardes (chiffree) values (true)$q$,
  'sauvegardes : personne ne les écrit depuis l''appli');
select pg_temp.console();
insert into public.sauvegardes (chiffree, taille_octets) values (true, 1234);
select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
select pg_temp.attendu(
  (select count(*) from public.erreurs where message = 'Erreur de test') = 1
  and (select count(*) from public.sauvegardes) = 1,
  'erreurs et sauvegardes : l''admin les lit');
select pg_temp.console();

-- ---------- Présences (classes et appel) -----------------------------
select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
insert into public.classes (id, etablissement_id, nom, jours) values
  ('c1a55e00-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Coran', '{1,2,4}');
insert into public.classes_cheikhs (classe_id, maitre_id) values
  ('c1a55e00-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a');
insert into public.membres_classe (id, classe_id, eleve_id) values
  ('3e3b0000-0000-0000-0000-000000000001', 'c1a55e00-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
insert into public.membres_classe (id, classe_id, prenom, nom) values
  ('3e3b0000-0000-0000-0000-000000000002', 'c1a55e00-0000-0000-0000-000000000001', 'Sara', 'M.');
select pg_temp.doit_echouer(
  $q$insert into public.membres_classe (classe_id, eleve_id)
     values ('c1a55e00-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001')$q$,
  'présences : un élève d''une autre école ne rejoint pas la classe');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.attendu((select count(*) from public.membres_classe) = 2, 'présences : le Cheikh voit les élèves de sa classe');
select public.enregistrer_appel('c1a55e00-0000-0000-0000-000000000001', current_date,
  '[{"membre":"3e3b0000-0000-0000-0000-000000000002","statut":"absent","note":"malade"}]'::jsonb);
select pg_temp.attendu(
  (select statut from public.presences where membre_id = '3e3b0000-0000-0000-0000-000000000002') = 'absent'
  and (select statut from public.presences where membre_id = '3e3b0000-0000-0000-0000-000000000001') = 'present',
  'présences : l''appel enregistre les absents, les autres sont présents');
select public.enregistrer_appel('c1a55e00-0000-0000-0000-000000000001', current_date, '[]'::jsonb);
select pg_temp.attendu(
  (select count(*) from public.presences) = 2
  and (select statut from public.presences where membre_id = '3e3b0000-0000-0000-0000-000000000002') = 'present',
  'présences : refaire l''appel du jour le remplace (rejouable hors ligne)');
select pg_temp.doit_echouer(
  $q$select public.enregistrer_appel('c1a55e00-0000-0000-0000-000000000001', current_date + 10, '[]'::jsonb)$q$,
  'présences : pas d''appel pour un cours à venir');

select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.attendu((select count(*) from public.classes) = 0 and (select count(*) from public.presences) = 0,
  'présences : un Cheikh d''une autre école ne voit rien');
select pg_temp.doit_echouer(
  $q$select public.enregistrer_appel('c1a55e00-0000-0000-0000-000000000001', current_date, '[]'::jsonb)$q$,
  'présences : un Cheikh d''une autre école ne fait pas l''appel');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.attendu((select count(*) from public.classes) = 0 and (select count(*) from public.presences) = 0,
  'présences : un élève ne voit pas les présences');
select pg_temp.console();
-- Classe sans ce Cheikh : il ne la voit pas ; élève retiré : absent du prochain appel.
insert into public.classes (id, etablissement_id, nom, jours) values
  ('c1a55e00-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Fiqh', '{6,7}');
update public.membres_classe set actif = false where id = '3e3b0000-0000-0000-0000-000000000002';
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.attendu((select count(*) from public.classes) = 1,
  'présences : un Cheikh ne voit que les classes dont il est Cheikh');
select public.enregistrer_appel('c1a55e00-0000-0000-0000-000000000001', current_date - 1, '[]'::jsonb);
select pg_temp.attendu(
  (select count(*) from public.presences p join public.appels a on a.id = p.appel_id where a.date = current_date - 1) = 1,
  'présences : un élève retiré de la classe n''est plus à l''appel');
select pg_temp.console();
update public.profils set actif = false where id = 'a0000000-0000-0000-0000-00000000000a';
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.attendu((select count(*) from public.classes) = 0, 'présences : un Cheikh désactivé ne voit plus ses classes');
select pg_temp.console();
update public.profils set actif = true where id = 'a0000000-0000-0000-0000-00000000000a';

-- Statuts : présent ou absent seulement.
select pg_temp.doit_echouer(
  $q$update public.presences set statut = 'retard'$q$,
  'présences : seuls « présent » et « absent » existent');

-- Le Cheikh ne crée pas de classe (c'est le responsable).
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.doit_echouer(
  $q$insert into public.classes (etablissement_id, nom) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Tajwid')$q$,
  'présences : un Cheikh ne crée pas de classe');
insert into public.membres_classe (classe_id, prenom) values ('c1a55e00-0000-0000-0000-000000000001', 'Nouvel');
select pg_temp.attendu(
  exists (select 1 from public.membres_classe where prenom = 'Nouvel'),
  'présences : le Cheikh ajoute un élève arrivé en cours d''année');
select pg_temp.console();

-- Responsable de la mosquée A.
insert into auth.users (id, email, raw_user_meta_data) values
  ('e0000000-0000-0000-0000-00000000000e', 'resp.a@test.local',
   '{"etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Resp","nom":"A"}');
update public.profils set role = 'responsable' where id = 'e0000000-0000-0000-0000-00000000000e';
select pg_temp.en_tant_que('e0000000-0000-0000-0000-00000000000e');
select pg_temp.attendu((select count(*) from public.classes) = 2,
  'responsable : voit toutes les classes de sa mosquée');
select pg_temp.attendu((select count(*) from public.presences) > 0, 'responsable : voit les présences');
select pg_temp.attendu((select count(*) from public.seances) = 0 and (select count(*) from public.passages) = 0,
  'responsable : aucun accès au suivi du Coran');
select pg_temp.attendu(
  exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000001'),
  'responsable : voit les noms des élèves de sa mosquée');
insert into public.classes (id, etablissement_id, nom, jours) values
  ('c1a55e00-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Arabe', '{3}');
insert into public.classes_cheikhs (classe_id, maitre_id) values
  ('c1a55e00-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a');
insert into public.membres_classe (classe_id, prenom, nom) values ('c1a55e00-0000-0000-0000-000000000003', 'Lina', 'K.');
select pg_temp.attendu((select count(*) from public.classes) = 3, 'responsable : crée une classe et désigne son Cheikh');
select pg_temp.doit_echouer(
  $q$select public.enregistrer_appel('c1a55e00-0000-0000-0000-000000000003', current_date, '[]'::jsonb)$q$,
  'responsable : ne fait pas l''appel');
select pg_temp.doit_echouer(
  $q$insert into public.classes (etablissement_id, nom) values ('bbbbbbbb-0000-0000-0000-000000000000', 'Ailleurs')$q$,
  'responsable : ne crée pas de classe dans une autre mosquée');
select pg_temp.doit_echouer(
  $q$insert into public.classes_cheikhs (classe_id, maitre_id)
     values ('c1a55e00-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-00000000000b')$q$,
  'responsable : ne désigne pas un Cheikh d''une autre mosquée');
select pg_temp.console();

-- ---------- Écouté puis validé par le Cheikh (par passage) -------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'ecoute');
select pg_temp.attendu(
  (select bool_and(corrige_le is not null and valide_le is null) from public.passages where seance_id = '5e000000-0000-0000-0000-0000000000a1'),
  'Cheikh : marque les passages « écoutés »');
select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'valide');
select pg_temp.attendu(
  (select bool_and(valide_le is not null and valide_par = 'a0000000-0000-0000-0000-00000000000a' and corrige_le is not null)
     from public.passages where seance_id = '5e000000-0000-0000-0000-0000000000a1'),
  'Cheikh : valide les passages (validé suppose écouté)');
select pg_temp.console();

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
select pg_temp.doit_echouer(
  $q$select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'valide')$q$,
  'élève : ne marque pas lui-même ses passages');
update public.passages set valide_par = null, valide_le = null, corrige_le = null where seance_id = '5e000000-0000-0000-0000-0000000000a1';
-- Réenregistrer la séance telle quelle (mêmes passages).
select public.enregistrer_seance(s.date, s.type, s.duree_min, null, s.note_libre,
  (select jsonb_agg(jsonb_build_object('sourateDebut', sourate_debut, 'versetDebut', verset_debut,
                                       'sourateFin', sourate_fin, 'versetFin', verset_fin) order by ordre)
     from public.passages where seance_id = s.id))
  from public.seances s where s.id = '5e000000-0000-0000-0000-0000000000a1';
select pg_temp.console();
select pg_temp.attendu(
  (select bool_and(valide_le is not null) from public.passages where seance_id = '5e000000-0000-0000-0000-0000000000a1'),
  'élève : ne peut pas retirer la validation, et réenregistrer sans changement la garde');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
-- Un seul passage, modifié (un verset de plus que le premier passage).
select public.enregistrer_seance(s.date, s.type, s.duree_min, null, s.note_libre,
  (select jsonb_build_array(jsonb_build_object('sourateDebut', 67, 'versetDebut', 1, 'sourateFin', 67, 'versetFin', 3))))
  from public.seances s where s.id = '5e000000-0000-0000-0000-0000000000a1';
select pg_temp.console();
select pg_temp.attendu(
  (select bool_and(corrige_le is null and valide_le is null) from public.passages where seance_id = '5e000000-0000-0000-0000-0000000000a1'),
  'élève : un passage modifié redevient « pas encore écouté »');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'valide');
select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'aucun', array[1]::smallint[]);
select pg_temp.attendu(
  (select bool_and(corrige_le is null and valide_le is null) from public.passages where seance_id = '5e000000-0000-0000-0000-0000000000a1'),
  'Cheikh : peut revenir en arrière');
select public.valider_seance('5e000000-0000-0000-0000-0000000000a1');
select pg_temp.attendu(
  (select bool_and(valide_le is not null) from public.passages where seance_id = '5e000000-0000-0000-0000-0000000000a1'),
  'Cheikh : « valider en un geste » valide tous les passages');
select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.doit_echouer(
  $q$select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'aucun')$q$,
  'Cheikh d''une autre mosquée : ne marque pas');
select pg_temp.doit_echouer(
  $q$select public.marquer_passages('5e000000-0000-0000-0000-0000000000a1', 'n_importe_quoi')$q$,
  'état inconnu refusé');
select pg_temp.console();

-- ---------- Suivi du Coran : chaque Cheikh voit les élèves de SES classes ----
-- État : classe « Coran » (Cheikh A) avec l'élève 1 ; l'élève 2 n'est dans aucune classe.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-0000000000a2', 'maitre.a2@test.local', '{"role":"maitre","etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Maître","nom":"A2"}');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-0000000000a2');
select pg_temp.attendu(not exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000001'),
  'classes : un Cheikh ne voit pas l''élève de la classe d''un autre Cheikh');
select pg_temp.attendu((select count(*) from public.seances where eleve_id = 'a0000000-0000-0000-0000-000000000001') = 0,
  'classes : ni ses séances');
select pg_temp.attendu(exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000002'),
  'classes : un élève sans classe reste visible par les Cheikhs de sa mosquée');
select pg_temp.doit_echouer(
  $q$insert into public.commentaires (eleve_id, auteur_id, texte)
     values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000a2', 'Intrus')$q$,
  'classes : un Cheikh ne commente pas l''élève d''une autre classe');
select pg_temp.console();

-- L'élève 2 rejoint la classe du Cheikh A2.
insert into public.classes (id, etablissement_id, nom, jours) values ('c1a55e00-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 'Coran du soir', '{1,3}');
insert into public.classes_cheikhs (classe_id, maitre_id) values ('c1a55e00-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-0000000000a2');
insert into public.membres_classe (classe_id, eleve_id) values ('c1a55e00-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.attendu(exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000001'),
  'classes : le Cheikh voit l''élève de sa classe');
select pg_temp.attendu(not exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000002'),
  'classes : l''élève placé dans la classe d''un autre Cheikh n''est plus visible');
select pg_temp.en_tant_que('a0000000-0000-0000-0000-0000000000a2');
select pg_temp.attendu(exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000002')
  and (select count(*) from public.seances where eleve_id = 'a0000000-0000-0000-0000-000000000002') > 0,
  'classes : le nouveau Cheikh voit son élève et ses séances');
select pg_temp.console();

-- Classe terminée : ses élèves redeviennent « sans classe ».
update public.classes set archivee = true where id = 'c1a55e00-0000-0000-0000-000000000001';
select pg_temp.en_tant_que('a0000000-0000-0000-0000-0000000000a2');
select pg_temp.attendu(exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000001'),
  'classes : l''élève d''une classe terminée redevient visible par la mosquée');
select pg_temp.console();
update public.classes set archivee = false where id = 'c1a55e00-0000-0000-0000-000000000001';

-- Une classe sans Cheikh désigné ne retire l'élève à personne.
insert into public.classes (id, etablissement_id, nom) values
  ('c1a55e00-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000', 'Sans Cheikh');
update public.membres_classe set actif = false where classe_id = 'c1a55e00-0000-0000-0000-000000000004';
insert into public.membres_classe (classe_id, eleve_id)
  values ('c1a55e00-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002');
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.attendu(exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000002'),
  'classes : un élève d''une classe sans Cheikh reste visible par la mosquée');
select pg_temp.console();
delete from public.membres_classe where classe_id = 'c1a55e00-0000-0000-0000-000000000005';
update public.membres_classe set actif = true where classe_id = 'c1a55e00-0000-0000-0000-000000000004';

-- Invitation avec une classe : l'élève y entre dès la création de son compte.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000003', 'eleve3.a@test.local',
   '{"etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Élève","nom":"Trois","classe_id":"c1a55e00-0000-0000-0000-000000000004"}'),
  ('a0000000-0000-0000-0000-000000000004', 'eleve4.a@test.local',
   '{"etablissement_id":"bbbbbbbb-0000-0000-0000-000000000000","prenom":"Élève","nom":"Quatre","classe_id":"c1a55e00-0000-0000-0000-000000000004"}');
select pg_temp.attendu(
  exists (select 1 from public.membres_classe where eleve_id = 'a0000000-0000-0000-0000-000000000003' and classe_id = 'c1a55e00-0000-0000-0000-000000000004'),
  'invitation : l''élève invité rejoint la classe du Cheikh');
select pg_temp.attendu(
  not exists (select 1 from public.membres_classe where eleve_id = 'a0000000-0000-0000-0000-000000000004'),
  'invitation : une classe d''une autre mosquée est ignorée');
select pg_temp.doit_echouer(
  $q$insert into public.invitations_classe (etablissement_id, code, expire_le, classe_id)
     values ('bbbbbbbb-0000-0000-0000-000000000000', repeat('x', 30), now() + interval '1 day', 'c1a55e00-0000-0000-0000-000000000004')$q$,
  'QR code : la classe doit être de la mosquée du code');

-- Invitation d'un Cheikh avec une classe : il en devient Cheikh dès la création de son compte.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-0000000000a5', 'cheikh5.a@test.local',
   '{"role":"maitre","etablissement_id":"aaaaaaaa-0000-0000-0000-000000000000","prenom":"Cheikh","nom":"Cinq","classe_id":"c1a55e00-0000-0000-0000-000000000004"}'),
  ('a0000000-0000-0000-0000-0000000000a6', 'cheikh6.a@test.local',
   '{"role":"maitre","etablissement_id":"bbbbbbbb-0000-0000-0000-000000000000","prenom":"Cheikh","nom":"Six","classe_id":"c1a55e00-0000-0000-0000-000000000004"}');
select pg_temp.attendu(
  exists (select 1 from public.classes_cheikhs where maitre_id = 'a0000000-0000-0000-0000-0000000000a5' and classe_id = 'c1a55e00-0000-0000-0000-000000000004')
  and not exists (select 1 from public.membres_classe where eleve_id = 'a0000000-0000-0000-0000-0000000000a5'),
  'invitation : le Cheikh invité devient Cheikh de la classe choisie');
select pg_temp.attendu(
  not exists (select 1 from public.classes_cheikhs where maitre_id = 'a0000000-0000-0000-0000-0000000000a6'),
  'invitation : un Cheikh n''entre pas dans la classe d''une autre mosquée');
select pg_temp.attendu(
  (select role from public.profils where id = 'a0000000-0000-0000-0000-0000000000a5') = 'maitre',
  'invitation : le Cheikh invité garde son rôle');
delete from auth.users where id in ('a0000000-0000-0000-0000-0000000000a5', 'a0000000-0000-0000-0000-0000000000a6');

-- Retour à l'état attendu par la suite : l'élève 2 sans classe (Cheikh A).
update public.membres_classe set actif = false where classe_id = 'c1a55e00-0000-0000-0000-000000000004' and eleve_id = 'a0000000-0000-0000-0000-000000000002';
delete from auth.users where id in ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004');

-- ---------- Ouvertures de l'appli -------------------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000001');
insert into public.ouvertures default values;
insert into public.ouvertures default values;
select pg_temp.attendu((select count(*) from public.ouvertures) = 1,
  'ouvertures : une seule par quart d''heure');
select pg_temp.doit_echouer(
  $q$insert into public.ouvertures (user_id) values ('a0000000-0000-0000-0000-00000000000a')$q$,
  'ouvertures : impossible au nom d''un autre');
select pg_temp.attendu((select ouverte_le from public.ouvertures) = now(),
  'ouvertures : l''heure vient de la base');
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
insert into public.ouvertures default values;
select pg_temp.attendu((select count(*) from public.ouvertures) = 1,
  'ouvertures : chacun ne voit que les siennes');
select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
select pg_temp.attendu((select count(*) from public.dernieres_ouvertures()) = 2,
  'ouvertures : l''admin voit la dernière utilisation de chacun');
select pg_temp.console();

-- ---------- Suppression définitive d'un élève -------------------------
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.doit_echouer(
  $q$select public.supprimer_eleve('a0000000-0000-0000-0000-000000000001')$q$,
  'suppression : refusée tant que l''élève n''est pas archivé');
update public.profils set actif = false where id = 'a0000000-0000-0000-0000-000000000001';

select pg_temp.en_tant_que('b0000000-0000-0000-0000-00000000000b');
select pg_temp.doit_echouer(
  $q$select public.supprimer_eleve('a0000000-0000-0000-0000-000000000001')$q$,
  'suppression : refusée au maître d''une autre école');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-000000000002');
select pg_temp.doit_echouer(
  $q$select public.supprimer_eleve('a0000000-0000-0000-0000-000000000001')$q$,
  'suppression : refusée à un élève');

select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
select pg_temp.doit_echouer(
  $q$select public.supprimer_eleve('a0000000-0000-0000-0000-00000000000a')$q$,
  'suppression : un maître ne peut pas être supprimé par cette voie');
select public.supprimer_eleve('a0000000-0000-0000-0000-000000000001');

select pg_temp.console();
select pg_temp.attendu(
  not exists (select 1 from auth.users where id = 'a0000000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.seances where eleve_id = 'a0000000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.bilans_mensuels where eleve_id = 'a0000000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.commentaires where eleve_id = 'a0000000-0000-0000-0000-000000000001'),
  'suppression : le compte et toutes les données de l''élève sont effacés');
select pg_temp.attendu(
  not exists (select 1 from public.journal_audit
              where eleve_id = 'a0000000-0000-0000-0000-000000000001' and (avant is not null or apres is not null)),
  'suppression : le journal ne garde plus de données personnelles de l''élève');
select pg_temp.attendu(
  exists (select 1 from public.journal_audit
          where action = 'SUPPRESSION_ELEVE' and eleve_id = 'a0000000-0000-0000-0000-000000000001'
            and acteur_id = 'a0000000-0000-0000-0000-00000000000a'),
  'suppression : le journal garde qui a supprimé et quand');
select pg_temp.attendu(
  exists (select 1 from public.seances where eleve_id = 'a0000000-0000-0000-0000-000000000002'),
  'suppression : les autres élèves ne sont pas touchés');

-- ---------- Suppression d'un utilisateur par l'admin ------------------
-- Le maître A corrige et commente une séance de l'élève 2.
select pg_temp.en_tant_que('a0000000-0000-0000-0000-00000000000a');
update public.seances set duree_min = 25 where id = '5e000000-0000-0000-0000-0000000000a2';
insert into public.commentaires (eleve_id, auteur_id, seance_id, texte) values
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a',
   '5e000000-0000-0000-0000-0000000000a2', 'Bien, continue');
select pg_temp.doit_echouer(
  $q$select public.supprimer_utilisateur('a0000000-0000-0000-0000-000000000002')$q$,
  'suppression admin : refusée à un maître');

select pg_temp.en_tant_que('ad000000-0000-0000-0000-0000000000ad');
select pg_temp.doit_echouer(
  $q$select public.supprimer_utilisateur('ad000000-0000-0000-0000-0000000000ad')$q$,
  'suppression admin : on ne peut pas se supprimer soi-même');
select public.supprimer_utilisateur('a0000000-0000-0000-0000-00000000000a');
select public.supprimer_utilisateur('b0000000-0000-0000-0000-000000000001'); -- élève actif, sans archivage

select pg_temp.console();
select pg_temp.attendu(
  not exists (select 1 from auth.users where id = 'a0000000-0000-0000-0000-00000000000a')
  and not exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-00000000000a'),
  'suppression admin : le compte du maître est supprimé');
select pg_temp.attendu(
  (select modifiee_par is null and duree_min = 25 from public.seances where id = '5e000000-0000-0000-0000-0000000000a2'),
  'suppression admin : les séances de ses élèves restent, sa correction devient anonyme');
select pg_temp.attendu(
  not exists (select 1 from public.passages where corrige_par = 'a0000000-0000-0000-0000-00000000000a'),
  'suppression admin : ses marques de correction sur les passages deviennent anonymes');
select pg_temp.attendu(
  not exists (select 1 from public.seances where modifiee_par = 'ad000000-0000-0000-0000-0000000000ad'),
  'suppression admin : la suppression n''est pas comptée comme une correction de l''admin');
select pg_temp.attendu(
  not exists (select 1 from public.commentaires where auteur_id = 'a0000000-0000-0000-0000-00000000000a'),
  'suppression admin : les commentaires du maître sont supprimés');
select pg_temp.attendu(
  exists (select 1 from public.profils where id = 'a0000000-0000-0000-0000-000000000002'),
  'suppression admin : ses élèves restent inscrits');
select pg_temp.attendu(
  not exists (select 1 from public.profils where id = 'b0000000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.seances where eleve_id = 'b0000000-0000-0000-0000-000000000001'),
  'suppression admin : un élève est supprimé avec ses données, même sans archivage');
select pg_temp.attendu(
  not exists (select 1 from public.journal_audit
              where eleve_id in ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000001')
                and (avant is not null or apres is not null)),
  'suppression admin : le journal ne garde plus leurs données personnelles');
select pg_temp.attendu(
  (select count(*) from public.journal_audit where action = 'SUPPRESSION_UTILISATEUR') = 2,
  'suppression admin : le journal garde la trace des deux suppressions');

select pg_temp.console();
rollback;
