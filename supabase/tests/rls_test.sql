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
