# Suivi cours Coran

Application web (mobile d'abord) de suivi de l'**apprentissage** et de la **révision** du Coran.
Chaque élève saisit ses séances, le maître suit, corrige et commente, et l'admin supervise.

- **Stack** : Next.js (TypeScript) · Supabase (PostgreSQL, Auth, RLS) · Vercel
- **Conventions et architecture** : voir [`CLAUDE.md`](./CLAUDE.md)

## Démarrer en local

Prérequis : Node 22, Docker (pour le Supabase local).

```bash
npm install
npm run db:start          # Supabase local : affiche l'URL et la clé « anon »
cp .env.example .env.local   # puis colle l'URL et la clé « anon »
npm run dev               # http://localhost:3000
```

Les e-mails envoyés en local (invitations…) sont visibles dans l'outil de messagerie local que `db:start` affiche.

### Créer les premiers comptes en local

L'inscription libre est désactivée. Pour tester, dans Supabase Studio (http://127.0.0.1:54323) :

1. **Authentication → Add user** : crée ton compte avec un mot de passe.
2. **SQL Editor** :
   ```sql
   -- toi : administrateur
   update profils set role = 'admin' where id = (select id from auth.users where email = 'toi@exemple.fr');
   -- un établissement
   insert into etablissements (nom) values ('Ma classe') returning id;
   ```
   Les invitations de maîtres et d'élèves depuis l'application arrivent dans une prochaine PR.

## Commandes utiles

| Commande           | Rôle                                                       |
| ------------------ | ---------------------------------------------------------- |
| `npm run check`    | Format, lint, types et tests unitaires (ce que fait la CI) |
| `npm test`         | Tests unitaires (couche domaine)                           |
| `npm run db:test`  | Tests des règles d'accès sur le Supabase local             |
| `npm run db:reset` | Recrée la base locale à partir des migrations              |
| `npm run db:types` | Régénère les types TypeScript de la base                   |

## CI/CD

- **Chaque PR** (GitHub Actions) : format, lint, types, tests unitaires, migrations + tests des règles d'accès sur un vrai PostgreSQL Supabase, build de production. La PR ne se fusionne que si tout est vert.
- **Prévisualisation** : Vercel déploie chaque PR sur une URL de test.
- **Fusion sur `main`** : Vercel met le site en production ; le workflow `Déploiement de la base` applique les nouvelles migrations à Supabase.
- **Dependabot** propose chaque semaine les mises à jour de dépendances.

## Mise en production (une seule fois)

1. **Supabase** — crée 2 projets en région **UE (Frankfurt)** : `suivi-coran-staging` et `suivi-coran-prod`.
   - _Authentication → Providers → Email_ : désactive « Allow new users to sign up ».
   - _Authentication → URL Configuration_ : Site URL = l'URL Vercel de production ; ajoute `https://<ton-domaine>/auth/confirm` aux Redirect URLs.
   - _Authentication → Email Templates_ : colle les modèles de `supabase/templates/` (invitation et réinitialisation).
2. **Vercel** — importe le dépôt GitHub, puis dans _Settings → Environment Variables_ :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (Production → projet prod, Preview → projet staging) ;
   - `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement).
3. **GitHub** — _Settings → Secrets and variables → Actions_, environnement `production` :
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
4. **GitHub** — _Settings → Branches_ : protège `main` (PR obligatoire, contrôles CI requis).
5. Après le premier déploiement, désigne ton compte admin avec la requête SQL ci-dessus, dans le projet prod.

Ne partage jamais ces clés dans un chat, un ticket ou un commit.

## Structure

```
src/app/           pages et actions serveur
src/services/      cas d'utilisation, gardes d'accès
src/repositories/  accès à Supabase (seule couche autorisée)
src/domain/        règles métier pures + tests
supabase/          migrations, tests RLS, modèles d'e-mails
```
