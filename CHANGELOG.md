# Historique des versions

Toutes les évolutions notables de « Suivi cours Coran ». Numérotation `MAJEUR.MINEUR.CORRECTIF` :

- **CORRECTIF** (1.0.**1**) : correction de bug, petite retouche, sans nouveauté visible ;
- **MINEUR** (1.**1**.0) : nouvelle fonctionnalité, compatible avec l'existant ;
- **MAJEUR** (**2**.0.0) : changement qui oblige les utilisateurs à changer leurs habitudes.

Chaque mise en production (PR `main` → `prod`) porte une nouvelle version, décrite ici.
Elle est publiée automatiquement comme « Release » GitHub (étiquette `vX.Y.Z`).

## [1.14.0] — 2026-11-13

### Nouveautés

- Suivi du Coran : chaque Cheikh ne voit et ne corrige que les élèves de **ses** classes. Un élève qui n'est dans aucune classe reste visible par les Cheikhs de sa mosquée, le temps de le placer.
- Un Cheikh qui a plusieurs classes passe de l'une à l'autre par des onglets dans « Ma classe ».
- Un élève invité par un Cheikh (e-mail ou QR code) rejoint directement sa classe ; avec plusieurs classes, le Cheikh choisit laquelle. Chaque Cheikh a son propre QR code.
- Mise à jour automatique : après une mise en ligne, l'appli se met à jour toute seule (au retour sur l'appli, au prochain lien touché, ou après 20 s sans geste), jamais pendant une saisie, une écoute ou une fenêtre ouverte.

### Amélioré

- Réactivité : vérification de la connexion sans aller-retour réseau quand c'est possible ; plus aucun appel à la base pour les polices, icônes et fichiers fixes ; écran d’attente immédiat dans les présences.

### Interne

- Tests des droits : deux Cheikhs d'une même mosquée, classe terminée, invitation avec classe, QR code d'une autre mosquée. Tests de bout en bout du cloisonnement et mesure des temps d'affichage.

## [1.13.0] — 2026-11-13

### Nouveautés

- Coran : appui long sur un verset pour son explication en français ; un simple toucher ouvre les actions (écouter, en boucle, mémoriser, explication, marque-page). Une astuce l'indique une fois.
- Marque-pages : un verset marqué est souligné en or et se retrouve dans « Aller à » → « Marques ».
- Arrêt automatique de l'écoute : après 15, 30 ou 60 minutes (avec un fondu) ou à la fin du passage.
- « Me réciter » : on s'enregistre sur un verset, puis « Comparer » fait entendre le récitateur et sa propre voix. Les enregistrements restent sur le téléphone et sont effacés à la déconnexion.
- Couleurs de la page du Coran : Auto, Clair, Sépia ou Sombre.
- Petit son et vibration discrets quand une séance, une correction ou un appel est enregistré (désactivables dans « Mon compte »).

### Corrigé

- Coran : changer de sourate pouvait rester bloqué de longues secondes quand mp3quran.net répondait mal ; la page s'affiche désormais sans attendre plus de 3 secondes cette liste complémentaire (trouvé par les tests de bout en bout).

## [1.12.0] — 2026-11-13

### Nouveautés

- Coran : toucher un verset affiche son explication en français (« Résumé dans l'exégèse du noble Coran », Al-Mukhtasar, traduction française de QuranEnc.com), avec ses notes et la source. En Warsh, l'explication suit la bonne numérotation. Une explication lue reste disponible hors ligne, et « Garder tout le texte » garde aussi les explications.
- Le verset touché propose ses actions en un coup d'œil : « Écouter d'ici », « En boucle », « Mémoriser… ».

### Interne

- Tests de bout en bout à chaque PR : l'appli complète dans un navigateur de téléphone, sur une base Supabase jetable avec des comptes fictifs (admin, deux Cheikhs de deux mosquées, deux élèves). Parcours : connexion, droits entre rôles et mosquées, séance de l'élève, correction du Cheikh, appel, tableau et rapport des présences, Coran (explication, défilement bloqué, « Aller à », favoris). Captures d'écran jointes au passage.

## [1.11.0] — 2026-11-13

### Nouveautés

- Récitateurs favoris : une étoile garde tes récitateurs préférés en haut de la liste. S'il n'y a pas de dernier choix pour cette lecture, ou s'il ne récite pas cette sourate, c'est le premier favori qui est pris. On peut toujours en choisir un autre.

### Amélioré

- Toutes les listes déroulantes deviennent des choix clairs qui montent du bas de l'écran : grandes lignes faciles à toucher, recherche pour les longues listes, numéros de versets en grille.
- Vue du Cheikh épurée : « Écouter dans le Coran » n'apparaît plus dans la correction d'une séance (réservé aux élèves).

## [1.10.0] — 2026-11-13

### Nouveautés

- Présences : organisation de la mosquée. Le responsable crée les classes et désigne leurs Cheikhs ; le Cheikh fait l'appel et ajoute les élèves arrivés en cours d'année.
- Rapport des présences pour le responsable : cette semaine, la semaine dernière, ce mois-ci, le mois dernier ou du … au …, pour une classe ou toutes ; à imprimer ou enregistrer en PDF, ou à partager.
- Carte « Appel du jour » en haut de « Ma classe » : bien visible tant que l'appel n'est pas fait, discrète ensuite.
- Aperçus « Voir comme le Cheikh » et « Voir comme le responsable » (administrateur).
- Coran : toucher un verset propose « Écouter à partir d'ici », « Répéter ce verset en boucle » ou « Mémoriser à partir d'ici ».
- Coran : « Aller à » une sourate (recherche par nom ou numéro), un juz ou une page du mushaf.

### Amélioré

- Présences : deux états seulement, présent ou absent (les anciens « en retard » comptent présents, les « excusés » absents). L'appel se fait d'un toucher sur ✓ ou ✗.
- Coran : le lecteur reste en bas de l'écran ; réglages rangés par thème (lecture Hafs / Warsh, récitation, affichage, hors ligne) ; « Mémoriser un passage » ne change plus la lecture avant « Écouter » et résume clairement les répétitions.

### Corrigé

- Coran : ouvrir les réglages ou la répétition puis faire défiler ne fait plus défiler la page derrière.

### Interne

- Droits en base pour le rôle « responsable » (lecture des présences de sa mosquée, organisation des classes, sans appel ni accès au Coran des élèves), testés.
- Feuille du bas réutilisable (fenêtre modale, défilement de la page bloqué).

## [1.9.1] — 2026-11-13

### Amélioré

- Appel : bouton « Tous présents » plus lisible ; boutons P/A/R/E adaptés aux petits téléphones.
- Tableau du mois : jour de la semaine au-dessus de chaque date, noms raccourcis pour voir plus de cours, lien vers la fiche des élèves qui ont un compte.
- Un appel gardé hors ligne n'est plus perdu si le serveur le refuse une fois : il est renvoyé (jusqu'à 5 fois).
- Journal : les classes, élèves de classe et appels apparaissent avec un nom lisible.

### Interne

- Tests des droits : Cheikh non rattaché à une classe, Cheikh désactivé, élève retiré de la classe.

## [1.9.0] — 2026-11-13

### Nouveautés

- Présences (version de test, visible par l'administrateur seulement) : classes d'une mosquée (ex. Coran lundi, mardi, jeudi ; Fiqh samedi, dimanche), avec leurs Cheikhs et leurs élèves, avec ou sans compte.
- L'appel en salle : tout le monde présent par défaut, un toucher pour absent, en retard ou excusé, une note si besoin. Sans réseau, l'appel est gardé sur le téléphone et part au retour de la connexion.
- Tableau du mois par classe : présences jour par jour, taux de présence, élèves à surveiller (absences de suite), partage du récapitulatif (WhatsApp, e-mail) et PDF.
- « Voir comme le responsable » : ce que verra le responsable de la mosquée (présences et absences seulement, lecture seule).
- Les droits sont déjà en place dans la base pour ouvrir plus tard l'appel aux Cheikhs de chaque classe.

## [1.8.0] — 2026-11-13

### Nouveautés

- L'appli s'ouvre sans réseau : la dernière page d'accueil reçue (fiche, classe, administration) s'affiche au lieu de « Pas de connexion ».
- Coran hors ligne : garder le texte des 114 sourates sur le téléphone, et télécharger la récitation d'une sourate (avec le suivi mot par mot) pour l'écouter sans connexion. Place utilisée affichée.

### Corrigé

- Tajwid en couleur : certaines lettres et voyelles s'affichaient mal (police inadaptée, signes séparés de leur lettre). Le tajwid utilise désormais la police du Complexe du Roi Fahd, avec la même rosace pour les numéros de versets.

## [1.7.0] — 2026-11-13

### Nouveautés

- Coran : surlignage mot par mot pendant la récitation (Hafs, récitateurs « le texte suit »), en texte normal comme avec le tajwid.
- Mémoriser un passage : du verset… au verset…, chaque verset répété 1 à 10 fois, le passage 1 à 5 fois ou sans fin ; les autres versets s'estompent.
- Vue « Mushaf » : le Coran page par page (604 pages), titre des sourates dans la page, numéro de page et juz, choix du juz et de la page, glisser pour tourner les pages.
- Séance d'un élève (vue de l'administrateur) : « Écouter dans le Coran » ouvre chaque passage dans la lecture de l'élève, prêt à répéter.
- Warsh : la récitation suit les bons versets (fichiers audio numérotés comme en Hafs, correspondance appliquée).
- Barre de récitation revue (récitateur et style, passage en cours, répétitions), 49 récitateurs qui suivent le texte.

## [1.6.0] — 2026-11-13

### Nouveautés

- Coran (administration) : page entièrement revue, sans débordement sur téléphone (cartouche de la sourate, page encadrée façon mushaf).
- Récitation qui suit le texte : avec les récitateurs « verset par verset » (EveryAyah, Hafs et Warsh), le verset récité s'allume et reste au centre de l'écran ; toucher un verset lance la récitation à partir de lui. Basmala récitée en Hafs.
- Barre de récitation toujours visible : lecture / pause, verset précédent / suivant, vitesse, répétition du verset, suivi à l'écran, taille du texte. Titre et commandes sur l'écran verrouillé.
- Tajwid en couleur (Hafs) avec sa légende.
- Les autres récitateurs (sourate entière) restent disponibles en « écoute seule ».

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
