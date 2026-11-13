# Historique des versions

Toutes les évolutions notables de « Suivi cours Coran ». Numérotation `MAJEUR.MINEUR.CORRECTIF` :

- **CORRECTIF** (1.0.**1**) : correction de bug, petite retouche, sans nouveauté visible ;
- **MINEUR** (1.**1**.0) : nouvelle fonctionnalité, compatible avec l'existant ;
- **MAJEUR** (**2**.0.0) : changement qui oblige les utilisateurs à changer leurs habitudes.

Chaque mise en production (PR `main` → `prod`) porte une nouvelle version, décrite ici.
Elle est publiée automatiquement comme « Release » GitHub (étiquette `vX.Y.Z`).

## [1.5.0] — 2026-11-13

### Nouveautés

- Administration : page « Coran » (réservée à l'administrateur pour l'instant). Texte complet en Hafs et en Warsh avec les polices du Complexe du Roi Fahd, choix de la sourate (phonétique et arabe), taille du texte réglable, et écoute de la sourate avec le récitateur de son choix (bibliothèque mp3quran.net, filtrée selon la lecture).

## [1.4.3] — 2026-11-13

### Corrigé

- Changement de mois ou d'onglet : la fiche ne semble plus se recharger une seconde fois à la fin de l'animation.

## [1.4.2] — 2026-11-13

### Corrigé

- Changer de mois ou passer d'apprentissage à révision ne fait plus remonter la page tout en haut.
- Plus de petit temps d'arrêt : les mois voisins et l'autre onglet sont chargés d'avance, et l'animation est plus courte et plus légère.

## [1.4.1] — 2026-11-13

### Corrigé

- Fiche d'un élève (vue du Cheikh) : nouvelle carte de l'élève, le nom n'est plus coupé, le menu ⋯ s'ouvre vers la gauche sans déborder de l'écran, « Voir la progression » sur toute la largeur.
- « Semaine 1 » ne se coupe plus sur deux lignes avec un grand texte.
- Haut d'écran plus compact sur téléphone (barre, bandeau de l'administration, marges).

## [1.4.0] — 2026-11-13

### Nouveautés

- Administration : dans la vue d'un Cheikh, choix entre « Lecture seule » et « Modifier » (modifier comme le Cheikh ; le mode modification revient de lui-même en lecture seule au bout de 12 heures).

### Corrigé

- Changement de mois sur téléphone : la barre du bas ne saute plus et la page ne remonte plus pendant l'animation.
- En-tête de l'élève plus soigné (carte, bouton Progression compact) ; la flèche des semaines repliées reste sur la ligne du titre.

## [1.3.0] — 2026-11-13

### Nouveautés

- Utilisation de l'appli : chaque ouverture (ou retour sur l'appli déjà connectée) est notée. L'administration affiche la dernière utilisation de chacun et le détail des ouvertures dans le journal.

### Retiré

- Double vérification de l'administrateur (appli d'authentification) : la connexion admin redevient le seul mot de passe.

### Amélioré

- Changement de mois et d'onglet plus fluide : le mois suit le doigt, s'efface dans le sens du geste puis le nouveau arrive de l'autre côté, sans saut de mise en page. Même effet avec les flèches.

## [1.2.0] — 2026-11-13

### Nouveautés

- Navigation au doigt : glisser sur la fiche pour changer de mois, tirer vers le bas pour actualiser.
- Transitions douces entre les pages.
- Raccourcis sur l'icône de l'appli installée (séance du jour, progression).
- Écran d'accueil pour un nouvel élève qui n'a encore aucune séance.
- Petite vibration (Android) quand une séance est enregistrée.
- Double vérification pour l'administrateur : code d'une appli d'authentification demandé après le mot de passe, appareils gérés dans « Double vérification ».

## [1.1.3] — 2026-11-13

### Interne

- Mises à jour des dépendances proposées par Dependabot : outils de vérification automatique, Supabase SSR 0.12, Prettier 3.9, types de Node.
- Les vérifications affichent la mise en forme attendue quand elle échoue.
- Garde-fous : délai avant de signaler un envoi direct (fausse alerte corrigée), y compris pour le déploiement de la base.
- Nettoyage automatique des branches de travail terminées.

## [1.1.2] — 2026-11-12

### Correctif

- Les serveurs du site restent à Dublin (`dub1`), près de la base de données (réglage effacé par erreur en 1.1.1, jamais mis en ligne).

## [1.1.1] — 2026-11-12

### Interne

- Vercel ne met plus en ligne que `main` (test) et `prod` (production) : les branches de travail ne consomment plus le quota quotidien de déploiements.

## [1.1.0] — 2026-11-12

### Sécurité

- Politique de sécurité du contenu (CSP) : seuls les scripts de l'appli s'exécutent (jeton différent à chaque page) ; l'appli ne peut pas être affichée dans le cadre d'un autre site.
- Anti-robots Cloudflare Turnstile prêt pour la connexion, le mot de passe oublié et l'inscription par QR code (s'active dès que ses clés sont configurées).
- Surveillance des dépendances : Dependabot propose chaque semaine les mises à jour ; la CI refuse une faille connue critique.

## [1.0.0] — 2026-11-12

Première version numérotée : celle en service auprès des élèves et des Cheikhs.

### Élèves

- Fiche du mois (apprentissage et révision), saisie des séances et des passages, brouillon gardé dans le téléphone.
- Saisie sans réseau : la séance part toute seule au retour de la connexion, sans écraser une séance modifiée entre-temps.
- Choix de la lecture **Hafs ou Warsh** à la première connexion (numérotation, hizb et carte du Coran suivent la lecture).
- Progression : versets appris, part vue par le Cheikh, carte du Coran, hizb à réviser.
- Fiche PDF du mois, appli installable sur l'écran d'accueil.

### Cheikh

- Classe avec les séances « à voir », validation en un geste, commentaires, objectifs et bilan du mois.

### Administration

- Établissements (créer, renommer, supprimer), comptes (filtres, déplacement, invitations en attente), état du site, journal filtrable, dernières connexions.
