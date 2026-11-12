# Conventions du projet — Suivi cours Coran

Ce fichier fixe les règles de travail sur le dépôt (pour les développeurs comme pour Claude).
Le propriétaire du projet peut le modifier à tout moment.

## Produit

- Suivi de l'apprentissage et de la révision du Coran. Le tajwid n'est plus saisi (colonne `seances.tajwid` conservée pour les anciennes données).
- Rôles : `eleve` (son suivi uniquement), `maitre` (les élèves de son établissement), `admin` (le fournisseur : tout, plus le journal d'audit).
- Dans l'interface, le rôle `maitre` s'affiche toujours « Cheikh » (« corrigée par le Cheikh », « ton Cheikh »…). Le code garde `maitre`.
- Plusieurs établissements possibles ; chaque maître et ses élèves sont isolés des autres.
- Fiche du mois : Semaine 1 = jours 1-7, S2 = 8-14, S3 = 15-21, S4 = 22-28, S5 = 29 → fin. « Jour N » = N-ième jour du bloc.
- Une séance par élève, par jour et par type (apprentissage / révision), avec plusieurs passages possibles.
- Interface en français, noms des sourates en phonétique ET en arabe. Mobile d'abord, responsive.

## Architecture (à respecter)

```
src/app/           Interface (pages, Server Actions). Ne parle jamais directement à Supabase.
src/services/      Cas d'utilisation, gardes d'accès.
src/repositories/  SEULE couche qui accède à Supabase.
src/domain/        Règles métier pures (aucun import de Next, React ou Supabase), testées avec Vitest.
src/lib/           Configuration (env, clients Supabase).
supabase/          Migrations SQL versionnées et tests des règles d'accès.
```

ESLint bloque les imports qui violent ces frontières.

## Sécurité

- Les droits sont appliqués par la base (RLS). Toute nouvelle table : `enable row level security` + politiques + tests dans `supabase/tests/rls_test.sql`.
- Jamais de secret dans le code. La clé « service role » ne sert que côté serveur et n'est jamais préfixée `NEXT_PUBLIC_`.
- Toute saisie est validée avec Zod côté serveur, puis par les contraintes SQL.
- Le schéma ne change que par une nouvelle migration dans `supabase/migrations/` ; ne jamais modifier une migration déjà fusionnée.

## Façon de travailler

- Branches : `main` = version de test (prévisualisation Vercel), `prod` = production (vrais élèves).
- Une branche et une PR par fonctionnalité, vers `main`. Pas de push direct sur `main` ni sur `prod`.
- Noms de branche : `feat/…` (fonctionnalité), `fix/…` (correction), `chore/…`, `docs/…`, `refactor/…`, `perf/…`, `test/…`
  (vérifié par le workflow « Garde-fou branches », qui signale aussi tout commit arrivé sur `main`/`prod` sans PR).
- Mise en production : une PR `main` → `prod` (le workflow « Garde-fou prod » refuse toute autre source).
  La fusion déploie le site (Vercel) et applique les migrations à la base de production.
- Versions (`MAJEUR.MINEUR.CORRECTIF`, voir CHANGELOG.md) : avant chaque mise en production, une PR `chore/version-x.y.z`
  vers `main` augmente la version (`npm run version:correctif | version:mineure | version:majeure`) et ajoute sa
  section `## [x.y.z] — date` dans CHANGELOG.md. « Garde-fou prod » refuse une mise en production sans nouvelle version.
  La fusion dans `prod` crée l'étiquette `vX.Y.Z` et la « Release » GitHub ; l'appli affiche la version
  (ouverture de l'appli installée, écran de connexion, « Mon compte », administration).
- Le dépôt est privé sur un compte GitHub gratuit : les règles de branche ne sont pas appliquées
  par GitHub, ces conventions sont donc à respecter scrupuleusement.
- Avant de proposer une PR : `npm run check` (format, lint, types, tests) et, si la base change, `npm run db:test`.
- Messages de commit en français, à l'impératif : « Ajoute la saisie des séances ».
- Auteur des commits : `maliossimo <55502349+maliossimo@users.noreply.github.com>` (adresse « noreply » de GitHub,
  jamais l'adresse e-mail personnelle). Configurer `git config user.name` / `user.email` avant le premier commit.
- Aucune mention d'outil de génération (« Generated with Claude Code », « Co-Authored-By: Claude »…) dans les commits ni dans les PR.
- Code et noms en français pour le métier (`seance`, `passage`, `eleve`), anglais toléré pour la technique.
