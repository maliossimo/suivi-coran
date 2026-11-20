# Historique des versions

Toutes les évolutions notables de « Suivi cours Coran ». Numérotation `MAJEUR.MINEUR.CORRECTIF` :

- **CORRECTIF** (1.0.**1**) : correction de bug, petite retouche, sans nouveauté visible ;
- **MINEUR** (1.**1**.0) : nouvelle fonctionnalité, compatible avec l'existant ;
- **MAJEUR** (**2**.0.0) : changement qui oblige les utilisateurs à changer leurs habitudes.

Chaque mise en production (PR `main` → `prod`) porte une nouvelle version, décrite ici.
Elle est publiée automatiquement comme « Release » GitHub (étiquette `vX.Y.Z`).

## [1.68.0] — 2026-11-20

### Modifié

- Les confirmations de suppression (élève archivé, utilisateur côté administration) s'ouvrent en feuille du bas, comme les autres choix de l'appli : même geste pour fermer (poignée, voile, retour), boutons larges en bas.

## [1.67.1] — 2026-11-20

### Corrigé

- `scripts/synchroniser-prod.sh` : le dépôt est lu dans l'adresse du remote (plus de dépendance à GraphQL).

## [1.67.0] — 2026-11-20

### Ajouté

- Progression : carte « Mois après mois » (temps de travail, jours travaillés, versets ajoutés, évolution par rapport au mois d'avant avec flèche et mot).
- Administration : les erreurs du site sont classées (réseau, mise à jour, affichage, navigateur, appli), expliquées en une phrase et marquées « sans gravité » quand c'est le cas ; le détail technique est replié.
- Thème sombre plus sombre la nuit profonde (après Icha et dernier tiers de la nuit).
- `scripts/synchroniser-prod.sh` : rattachement de `prod` à `main` après une fusion « squash » (procédure ajoutée à CLAUDE.md).

### Modifié

- Progression : la flamme des jours d'affilée n'apparaît qu'à partir de 2 jours.
- Tests visuels : après le renouvellement des captures, le workflow passe tous les parcours et pose lui-même le statut sur le nouveau commit (un seul lancement).

## [1.66.0] — 2026-11-20

### Ajouté

- Objectifs : la zone de saisie grandit avec le texte, donc un objectif long se lit et se corrige en entier (en lecture seule aussi). Un compteur apparaît près de la limite (300 caractères).
- Les objectifs s'enregistrent tout seuls en quittant le champ ; le bouton « Enregistrer » devient plein tant que le texte n'est pas enregistré.
- Statuts « En cours / Atteint / Non atteint » sur une rangée de même largeur, avec une icône pour chacun (plus seulement la couleur).
- Cartes de semaine : titre à gauche et bilan en badge à droite, dates dessous ; les points des jours ont chacun leur forme (rond plein, rond à cœur clair, carré doré, anneau, petit point).
- Les semaines repliées se déplient en douceur (navigateurs qui le permettent).

### Modifié

- Bandeau « Vue du Cheikh » : le libellé n'est plus coupé, le choix Lecture seule / Modifier passe dessous sur téléphone.
- Le bouton « remonter » n'apparaît qu'en remontant la page et s'efface au bout de 2,5 s : il ne cache plus « Enregistrer ».
- Le titre « Objectif du mois » n'est plus affiché deux fois.
- Fiche d'un élève sans séance : une icône devant le message.

## [1.65.0] — 2026-11-20

### Modifié

- Fondations de l'interface : une échelle commune pour les textes (12 · 13 · 14 · 16 · 18 · 22 · 28), les espacements (4 à 32) et les rayons (8 · 12 · 16 · 20), utilisée par les nouveaux styles ; les demi-tailles et les rayons isolés de l'existant sont ramenés à cette échelle.
- Le motif géométrique du fond est plus discret, pour ne plus gêner la lecture derrière les cartes.
- Les textes secondaires (gris) sont plus contrastés, en clair comme en sombre.
- Les icônes ont toutes le même trait fin et régulier.
- Le focus au clavier est plus net : anneau plus contrasté (3:1 sur fond clair), liseré qui le détache du fond, champs de saisie avec halo.
- La barre du système sous la barre de navigation (téléphone installé) prend la couleur sombre de l'appli au lieu du vert ; elle se met à jour avec l'installation de l'appli (parfois après quelques jours, ou en la réinstallant).

## [1.64.0] — 2026-11-19

### Modifié

- Résumé du mois : la tuile « jours d'affilée » n'apparaît qu'à partir de 2 jours d'affilée (un seul jour n'est pas une série).
- Résumé du mois mieux présenté : l'anneau de régularité en tête avec le pourcentage du mois, puis des tuiles de même taille (icône dans une pastille colorée, chiffres plus lisibles) ; avec un nombre impair de tuiles, la dernière prend toute la largeur.
- Barre compacte : la mosquée et le soleil passent en arrière-plan, le nom et le sous-titre restent lisibles par-dessus.

### Corrigé

- Heures de prière du ciel : un compte rattaché à aucun établissement (l'admin) utilisait le calcul approximatif, même quand une mosquée avait son calendrier Mawaqit importé. Il prend maintenant les heures de la mosquée importée en dernier.
- Quand le ciel utilise le calcul (pas les heures d'une mosquée), un « ≈ » discret suit le temps de prière dans la barre du haut.

## [1.63.1] — 2026-11-19

### Corrigé

- Titre trop long (« Administration ») : il se resserre et finit avant la mosquée.
- Ligne des dates : elle tient entièrement sous la ligne dorée de l'horizon, la mosquée est remontée de quelques pixels.
- Le nuage qui passait derrière le bouton du compte est retiré ; le palmier qui cachait le soleil en fin d'après-midi aussi.
- Barre compacte : le sol est d'un seul tenant (plus de marche ni de couture), la mosquée est à gauche du bouton « remonter » qui ne la cache plus, le soleil est rapproché de la mosquée.

## [1.63.0] — 2026-11-19

### Ajouté

- Le soleil et la lune suivent l'heure réelle : le soleil se lève au Chourouq, passe au-dessus de la grande coupole à midi et se couche au Maghrib (gros et orangé près de l'horizon, petit, blanc et rayonnant en haut) ; la lune prend le relais et traverse le ciel jusqu'à l'aube.
- La nuit en trois temps : le soir (fenêtres allumées, premières étoiles), la nuit profonde après l'Icha (la mosquée s'endort, il reste la porte, les minarets et deux fenêtres, plus d'étoiles), puis le dernier tiers de la nuit (ciel bleuté, ciel le plus étoilé, quelques fenêtres se rallument pour ceux qui se lèvent prier). Pas d'étoile filante.
- Transition douce (fondu court) quand on passe d'une page à une autre, sur les navigateurs qui le permettent ; elle ne bloque jamais la navigation.
- Écrans de chargement (squelettes) pour « Ma mosquée », « Nouveautés », l'appel, la création et le rapport de présences.

### Modifié

- La mosquée est redessinée : grande coupole sur son tambour, porche, deux petites coupoles, deux minarets à balcons, deux annexes, avec des collines, des toits et des palmiers au loin, et un sol sur toute la largeur qui porte la ligne des dates.
- Les lumières restent toujours dans les bâtiments : chaque fenêtre est découpée dans la forme de la mosquée (plus de lumière qui flotte à côté).
- Le titre ne passe plus sur la mosquée : il reste à gauche du ciel (les titres longs rapetissent) ; les deux étoiles du haut (ق et le compte) deviennent des lanternes suspendues au bord du ciel, de chaque côté de la mosquée.
- Les noms arabes de la barre du bas sont plus grands et bien lisibles.
- Le CSS du ciel est nettoyé : les anciennes règles empilées (fenêtres, ville, soleil) sont retirées, au profit d'un seul bloc.

## [1.62.0] — 2026-11-18

### Modifié

- La mosquée du ciel est redessinée et retrouve son contour doré : grande coupole en bulbe sur son tambour, deux petites coupoles, deux minarets fins avec leurs balcons, croissant au sommet.
- Ses fenêtres en arc vivent avec l'heure : lumière chaude la nuit, plus douce au Maghrib et à l'aube ; le jour, elles laissent voir le ciel, comme du verre.

— 2026-11-18

### Modifié

- Un vrai soleil et une vraie lune : la lune redevient argentée (mers grises, halo blanc bleuté), le soleil a un cœur blanc, une couronne jaune et une lueur chaude (orangé et rouge près de l'horizon à l'aube et au Maghrib) ; on les distingue au premier regard.
- Barre du haut plus sobre : la ville en silhouette unie, seul le haut de la grande coupole et du minaret bordé d'or ; fenêtres plus douces, le soir et la nuit ; lueurs plus petites ; le motif du ciel ne bouge plus ; filet et losange simples, sans lueur.
- Barre du bas plus sobre : fond uni et filet doré fin (plus de vague) ; Coran devient un onglet comme les autres, une fine arche autour de son icône ; l'onglet choisi garde une niche légère ; les noms arabes sont plus discrets, celui de l'onglet choisi en or.

### Corrigé

- La barre du bas est opaque : le texte de la page ne transparaît plus dessous ; le trait sous l'onglet choisi, qui barrait le nom arabe, est retiré.
- « Mon compte » (l'avatar en haut à droite) s'ouvre tout de suite, sans écran de chargement : la page est préparée à l'avance comme les onglets.

— 2026-11-18

### Modifié

- Plus sobre, toujours aussi belle : l'or est réservé au ciel, à l'onglet choisi et à ce qui appelle une action.
  - Barre du bas : plus d'étincelles ni de reflet qui court, une vague dorée fine et calme, l'arche sans lumière qui tourne.
  - Cartes : l'ambiance du moment à demi-teinte et une bordure ordinaire ; le liseré doré seulement sur « Appel du jour » (à faire) et « À écouter » ; la mosquée en filigrane seulement sur les cartes d'accueil.
  - Boutons : sans anneau doré ni grande lueur.
- Cartes un peu plus compactes sur téléphone (marges et arrondis réduits, titres un peu plus petits, moins d'espace entre les cartes).

### Corrigé

- Changement de mois : les flèches restent aux deux bords et le titre toujours au centre, quelle que soit la longueur du mois.
- « Aujourd'hui » : sur téléphone, l'icône passe au-dessus du libellé, et « Apprentissage » tient sur une seule ligne.

— 2026-11-18

### Amélioré (fluidité)

- Les onglets ne sont plus retardés après le Coran : les mots à revoir, la sourate suivante (lecture en continu) et la recherche « Aller à » se chargent par de simples lectures, qui ne passent plus dans la file des changements de page.
- Défilement plus fluide :
  - le fond d'ambiance est une couche fixe à part (plus de page entière redessinée à chaque pixel) ;
  - la barre du bas n'a plus de flou recalculé sous le contenu qui défile (même rendu, presque opaque) ;
  - les animations décoratives se mettent en pause pendant qu'on défile, et celles du ciel tant que la grande barre est hors de l'écran.
- Moins de calcul en continu : les animations à l'intérieur du ciel (étoiles, ville, halo, lanternes, nuages) avancent par petits pas, quelques images par seconde ; le reflet de la vague et les étincelles sont déplacés par la carte graphique.

— 2026-11-17

### Corrigé

- Lecteur du Coran : il passe au-dessus de la barre du bas (vague et arche), comme la barre « Enregistrer » et le bouton pour remonter.
- La lune et le soleil ont une vraie lueur : intense contre l'astre, elle se dissipe en s'éloignant (plus de disque plat).
- La lune se décale vers la droite : elle ne touche plus le titre calligraphié (« القرآن الكريم »…).

## [1.58.1] — 2026-11-17

### Corrigé

- Téléphone : le minaret de droite ne passe plus derrière l'avatar, il se dresse entre la lune et le compte.

## [1.58.0] — 2026-11-17

### Modifié

- Nouvelle identité « nuit dorée », dans toute l'appli :
  - toute la page prend l'ambiance du moment : rose et violet à l'aube, doré le jour, ambre et cuivre au Maghrib, vert profond la nuit (doré sur le parchemin en thème clair) ;
  - fond et cartes en dégradés, liseré doré discret, mosquée en filigrane dans les grandes cartes, boutons principaux en dégradé vert bordé d'or ;
  - barre du haut : ville bordée d'or aux fenêtres allumées, croissant doré, et la ville se tient derrière la ligne des dates (plus rien n'est écrit sur un minaret) ; sous la barre, un filet doré et un losange ;
  - barre du bas : une vague de lumière dorée avec des reflets et des étincelles remplace la frise ; l'arche du Coran est plus basse et plus discrète ; l'onglet choisi a sa niche et un trait de lumière ; chaque onglet porte son nom arabe calligraphié sous le nom français.

— 2026-11-17

### Modifié

- Thème clair : un parchemin chaud remplace le blanc (fond, cartes ivoire, léger motif) ; sous la barre, le ciel descend en lueur dorée au lieu d'un dégradé gris la nuit.
- Barre du bas : la frise s'arrête de chaque côté de l'arche du mihrab, sur deux chapiteaux dorés, comme si elle y entrait et en ressortait. L'arche est pleine : contour doré, intérieur vert profond en sombre et ivoire en clair, toute dorée quand on est sur sa page.
- L'onglet choisi est marqué par une niche dorée (la même arche que son contour) au lieu de l'étoile ; les motifs de la frise s'allument en passant au-dessus.
- Ordinateur : la lune ne passe plus sous le nom, elle se place entre les onglets et le compte.

### Corrigé

- En lisant le Coran, quand la barre du bas s'efface, l'arche et l'étoile ne dépassent plus en bas de l'écran.

— 2026-11-17

### Ajouté

- Administration : « Horaires Mawaqit » sur chaque établissement. On colle le lien de la page de la mosquée sur Mawaqit : ses horaires de l'année sont importés tout de suite, puis mis à jour seuls chaque mois (date du dernier import ou erreur affichée). Champ vide : la page est retirée et le ciel revient au calcul.

### Modifié

- Barre du bas : en verre, dans la couleur de la page (plus de bloc vert), avec un léger motif doré et une ombre douce ; le mihrab au repos devient une arche de lumière dorée translucide.
- La lumière de l'arche parcourt seulement sa courbe, en or doux (plus de trait blanc le long des côtés).

— 2026-11-17

### Corrigé

- Import Mawaqit : Mawaqit sert au serveur la version ordinateur de la page de la mosquée, où les horaires sont écrits un peu autrement ; ils y sont maintenant lus.
- Barre du bas : l'étoile ne glisse plus vers la droite quand elle scintille ; un halo doré s'allume derrière elle au passage de chaque motif.

## [1.55.0] — 2026-11-17

### Modifié

- En-tête compact (quand on descend dans la page) : il a maintenant le même ciel que la grande barre (moment de la journée, lune du mois ou soleil, coupoles en petit), sa frise dorée et son fondu ; le nom arabe de la page n'est plus collé au nom français.
- Barre du bas : les motifs de la frise s'allument en or en passant sous l'étoile, qui scintille à chaque passage ; une lumière fait le tour de l'arche du mihrab quand un motif y arrive. La frise ne saute plus en fin de boucle.
- Avatar de la barre du haut : une étoile à 8 branches dorée comme le logo, en verre sur le ciel, avec les initiales en or (lueur argentée la nuit). L'étoile du ciel qui faisait un point à côté a été déplacée.
- Horaires de la mosquée : seules les heures des prières sont gardées (Sobh, Chourouq, Dhuhr, Asr, Maghrib, Icha) ; l'iqama et Joumou'a sont retirées.

### Corrigé

- Import Mawaqit : quand la page reçue ne contient pas les horaires, l'erreur notée dit ce que Mawaqit a renvoyé (statut, adresse, titre), pour corriger vite.

## [1.54.0] — 2026-11-17

### Ajouté

- Horaires de la mosquée tenus à jour tout seuls : une fois par mois, le serveur relit la page publique Mawaqit de la mosquée (calendrier de l'année, changements d'heure compris) ; plus besoin de les réimporter à la main.
- Iqama de chaque prière et heures de Joumou'a enregistrées avec le calendrier.

### Sécurité

- Au plus une requête par mosquée et par jour vers Mawaqit, même si l'adresse de mise à jour est appelée plusieurs fois ; relecture immédiate réservée à la tâche planifiée (CRON_SECRET). En cas d'échec, les horaires déjà connus restent utilisés.

## [1.53.0] — 2026-11-17

### Ajouté

- Horaires de la mosquée : le ciel suit les heures exactes du calendrier de la mosquée (importé de Mawaqit : Fajr, Chourouq, Dhuhr, Asr, Maghrib, Icha) ; sans calendrier, le calcul reste en secours. Calendrier de la mosquée de Lieusaint importé.

### Modifié

- Un vrai ciel : dégradé du haut vers l'horizon, accordé au thème (clair ou sombre). La nuit, le ciel est noir, même en version claire.
- Soleil et lune dessinés : lueur chaude et disque clair pour le soleil (orangé à l'aube et au Maghrib), lune modelée avec ses mers et une lueur argentée.
- Fondu sous la barre : long et progressif, il part de la couleur exacte du bas de la barre et passe derrière le contenu (les textes restent nets).

## [1.52.0] — 2026-11-17

### Ajouté

- Fondu du ciel : sous la barre du haut, la couleur du ciel du moment descend doucement sur le haut de la page (rosée à l'aube, ambrée au Maghrib…) ; plus de coupure nette entre le ciel et la page. La frise laisse passer le ciel.
- Au-dessus de la barre du bas, le contenu s'efface doucement au lieu d'être coupé net.

### Modifié

- Le mihrab de la barre du bas est en creux au repos, plein et lumineux seulement quand on est sur sa page (on ne croit plus que « Ma classe » est sélectionné).
- Titres : « Inviter » (دعوة) sur la page d'invitation ; « سجلّ الطالب » et le nom de l'élève aussi sur ses séances. Calligraphie un peu plus grande.
- « Ma classe » : la date n'est plus répétée sous « Salam Cheikh … » (elle est dans la barre).

## [1.51.3] — 2026-11-17

### Corrigé

- Titre de la barre du haut : le titre calligraphié ou son nom français pouvait rester invisible après son animation d'arrivée (Chrome ne le redessinait pas). Il glisse maintenant depuis la droite en apparaissant.

## [1.51.2] — 2026-11-17

### Modifié

- Barre d'état du téléphone (heure, batterie) : elle prend la couleur du ciel du moment ; le ciel monte jusqu'en haut de l'écran, sans bande verte au-dessus.
- Coupoles pleines : le soleil couchant passe vraiment derrière la grande coupole. Lune et soleil un peu plus bas, jamais coupés.
- Barre du bas plus légère : le nom arabe seulement sous l'onglet choisi, frise plus fine (en haut aussi).
- Mois : les mois hégiriens plus discrets et jamais coupés (« ath-thania 14… »).
- Fiche d'un élève (vue du Cheikh) : la barre affiche « سجلّ الطالب » et le nom de l'élève, au lieu de « Ma classe ».
- « Vue du Cheikh » (administration) tient sur une ligne.
- Cartes « Aujourd'hui » : en grand texte, les mots se coupent proprement au lieu d'être tronqués.

## [1.51.1] — 2026-11-17

### Corrigé

- Mihrab de la barre du bas : le nom arabe n'est plus écrit en or sur l'or (l'icône seule dans le mihrab, « Coran » dessous), mihrab un peu plus fin.
- Ligne des dates : un espace entre la date et le temps de prière.
- Coucher du soleil : le soleil se couche derrière la grande coupole au lieu de passer sous la date hégirienne ; plus de nuage gris au crépuscule.

## [1.51.0] — 2026-11-17

### Ajouté

- **Une barre du haut vivante, à l'identité de l'appli** : le ciel suit les vraies heures de prière de la mosquée (aube, jour, coucher du soleil, nuit), au-dessus de coupoles et d'un minaret dont la lanterne s'allume le soir ; nuages le jour, étoiles et étoile filante la nuit, motif qui dérive lentement, frise de zellige dorée.
- **La vraie lune** : le croissant suit le jour du mois hégirien (fin au début du mois, pleine lune le 14).
- **Les moments qui comptent** : touche dorée le vendredi, pleine lune des jours blancs, lanternes pendant le Ramadan, étoiles d'or pour les deux Aïd.
- **Titres en calligraphie arabe** (Ruqʿa) avec le nom français dessous : حلقتي, الطلاب, القرآن الكريم, الحضور… La calligraphie se trace à l'arrivée sur la page. Sous le titre : la date française, le temps de prière en cours (« وقت الضحى »…) et la date hégirienne calligraphiée.
- **Barre du bas en arcade** : l'onglet choisi s'illumine d'un arc doré, une étoile à huit branches glisse vers lui, chaque onglet porte son nom arabe ; au centre, un **mihrab doré** pour le Coran (ou la classe du Cheikh).
- **Fêtes à l'image de l'appli** : une étoile de zellige s'ouvre quand une sourate ou un juz est terminé ; pour un juz, un cadre enluminé.
- **Ouverture signée** : « القرآن الكريم » s'écrit au calame sous le logo à l'ouverture de l'appli installée.
- **Version claire** : en mode clair, ciel de parchemin et coupoles ocre ; en sombre, la nuit verte.
- Administration : position de chaque mosquée (« Ma position » sur place, ou latitude et longitude) pour les heures de prière ; Paris en attendant.

### Modifié

- Le bandeau des dates disparaît : les dates sont dans la barre. « Appel du jour » tient dans une seule carte (une ligne par classe), « À écouter » prend le style des autres cartes, « Inviter » devient un petit bouton.
- Élève : « Mon compte » s'ouvre par l'avatar en haut à droite ; la barre du bas garde trois onglets, le Coran au centre.

## [1.50.3] — 2026-11-17

### Interne

- Mise en production plus rapide : la PR `main` → `prod` ne relance pas les vérifications quand la tête de `main` est exactement le contenu déjà vérifié sur sa PR (même base, même tête). Dans tous les autres cas, tout tourne comme avant. Rien ne change dans l'appli.

## [1.50.2] — 2026-11-17

### Corrigé

- Barre du haut sur téléphone : elle ne passe plus sur deux étages (l'avatar était repoussé dessous). Elle est plus basse qu'avant pour laisser la place au contenu, et les trois dates (française, hégirienne en français et en arabe) sont dans un fin bandeau centré juste dessous, qui part avec la page quand on fait défiler.

## [1.50.1] — 2026-11-17

### Modifié

- Barre du haut : les trois dates, aussi sur téléphone : date française avec l'année, date hégirienne en français et en arabe (« 17 nov. 2026 · 7 Joumada ath-thania 1448 », puis « ٧ جمادى الآخرة ١٤٤٨ هـ » sur la ligne suivante).

## [1.50.0] — 2026-11-17

### Ajouté

- Les deux calendriers ensemble : la barre du haut montre la date française et la date hégirienne (« Mar. 17 nov. · 7 Joumada ath-thania 1448 »), et chaque mois (fiche, classe du Cheikh, présences) montre sous son nom les mois hégiriens qu'il couvre, en phonétique et en arabe (« Joumada al-oula – ath-thania 1448 · جمادى الأولى – الآخرة ١٤٤٨ هـ »).

## [1.49.1] — 2026-11-17

### Corrigé

- Aperçu d'un élève sur téléphone : les deux boutons du bas prennent toute la largeur et « Ouvrir sa fiche » ne passe plus sur deux lignes.

## [1.49.0] — 2026-11-17

### Ajouté

- Date hégirienne du jour dans la barre du haut, pour tous les profils (élève, Cheikh, admin) : « 7 Joumada ath-thania 1448 », et en arabe sur les écrans larges. Calendrier Umm al-Qura (La Mecque) : il peut y avoir un jour d'écart avec l'annonce de ta mosquée.

### Modifié

- Aperçu d'un élève : les boutons « à écouter » et « Ouvrir sa fiche » restent collés en bas, sans faire défiler.
- Classe du Cheikh sur téléphone : cartes plus compactes, une flèche (hausse, stable, baisse sur 7 jours) remplace la petite courbe.

## [1.48.1] — 2026-11-17

### Corrigé

- Aperçu d'un élève : « Dernier jour de travail » montre toutes les séances du jour (apprentissage puis révision), plus seulement la dernière.

### Modifié

- Vue du Cheikh sur téléphone : pastille « aperçu » plus visible sur la photo, élèves « À écouter » sur plusieurs lignes (plus rien de coupé), passages à refaire en liste, date sous la salutation, et l'étiquette de lecture n'apparaît plus que pour l'élève qui ne lit pas comme les autres (ex. Warsh dans une classe Hafs).

## [1.48.0] — 2026-11-17

### Ajouté

- Vue du Cheikh : **aperçu rapide d'un élève** sans quitter la liste (toucher sa photo, ou appui long sur sa carte) : où il en est dans le Coran, sa dernière séance passage par passage, ce qui est à refaire, ses mots à revoir, et un bouton vers sa fiche.
- **Tendance d'un élève** dans l'aperçu : son travail semaine par semaine sur 8 semaines (les points dorés marquent les semaines où il a appris de nouveaux versets) et s'il est en progrès, régulier ou en baisse (4 dernières semaines comparées aux 4 d'avant).
- « À écouter » en haut de la classe : un toucher sur un élève ouvre ses séances à écouter.
- Classe encore vide : trois étapes pour accueillir les premiers élèves, avec le QR code et le lien à partager directement sur la page.

### Modifié

- Vue du Cheikh plus claire, sur une seule colonne : « Salam Cheikh … » et la date en haut, la liste des élèves d'abord, les chiffres du mois sur une ligne discrète en bas (plus de tuiles à zéro).

## [1.47.0] — 2026-11-17

### Ajouté

- « Passé avec le Cheikh » : l'élève marque lui-même chaque passage de sa séance (apprentissage et révision) et chaque partie de « Ce que je connais » : **Validé** ou **À refaire** ; son Cheikh garde la même possibilité, le dernier qui marque a raison. Les passages « à refaire » de la dernière séance se reprennent en un toucher dans la séance suivante. (« Écouté » devient « À refaire » partout ; les marques existantes ne changent pas.)
- Tester les enchaînements (Coran de l'élève) : la fin d'un verset que l'élève connaît, il récite le début du suivant, puis « Voir la réponse » (ou « Au micro » avec Réciter) et se note lui-même.
- Coran : lecture de nuit (Réglages → Couleurs → Nuit : fond noir, texte ambré doux) et numéros des versets en chiffres arabes ou occidentaux.
- Séance : boutons − / + pour changer un verset sans clavier.
- Bouton « remonter en haut » sur les longues pages.
- Accueil du Coran : « Réorganiser les cartes » (↑ / ↓), ordre retenu sur l'appareil.
- Petite fête discrète dans la progression quand une sourate ou un juz est terminé (une ligne dorée, une seule fois).
- Astuces au bon moment, une seule fois chacune (gestes du Mushaf, Réciter en texte caché, boutons − / +).

### Amélioré

- Vibrations très légères, sans son, en tournant une page du Mushaf et avec les boutons − / + (désactivables dans « Mon compte »).
- La police du Mushaf est préchargée : le Coran s'affiche tout de suite dans la bonne police.
- Cheikh sans élève : le message parle du lien et du QR code (plus de l'e-mail).

## [1.46.2] — 2026-11-17

### Ajouté

- Mots à revoir : un interrupteur dans les réglages du lecteur les active ou les coupe entièrement (soulignement sur la page, liste dans Réciter, carte de « Ma progression »). Choix retenu sur l'appareil.

## [1.46.1] — 2026-11-17

### Corrigé

- Coran : en haut, « Sourate | Mushaf » ne passe plus sous les boutons. La loupe disparaît : la recherche (sourate, mots arabes, « 2:255 ») se fait dans le menu « Aller à » (toucher le nom de la sourate). Trois outils plus étroits, sans icône sur les petits écrans.
- Lecteur : sur les petits écrans, plus de nom de récitateur coupé (« M… A… ») ; seulement le verset ou le temps pendant l'écoute (le récitateur se choisit d'un toucher sur cette zone).

### Amélioré

- Mots à revoir : plus de bandeau au-dessus du texte. La liste est dans Réciter (« N mots à revoir dans cette sourate » : un toucher prépare le verset, texte caché) et dans « Ma progression ». Le soulignement sur la page reste, et se coupe dans les réglages (« Souligner mes mots à revoir »).

## [1.46.0] — 2026-11-17

### Ajouté

- Coran : zoom. Pincer à deux doigts grossit ou réduit le texte ; sur la page du Mushaf, grossir fait passer le texte à la ligne librement (pastille « Revenir au Mushaf »). Taille retenue. En plein écran, boutons A− / A+.
- Coran : mots à revoir. Les mots ratés lors des récitations sont soulignés sur la page ; un bouton « N mots à revoir » les liste par verset, avec « Réciter » (texte caché, il se dévoile en récitant). Un mot sort de la liste après deux récitations réussies.
- Coran : recherche (loupe en haut). Un mot arabe avec ou sans voyelles, un nom de sourate (« Maryam », « مريم ») ou une référence (« 2:255 ») ; un toucher ouvre le verset.

### Amélioré

- Barre du bas plus légère, et en lisant le Coran elle s'efface quand on descend (elle revient dès qu'on remonte).
- Abdul Basit en Warsh : écoute seulement (le texte ne suit plus sa voix, ses fichiers étant mal découpés).
- Cartes : chiffre principal plus grand, détails en retrait. Textes clairs sur fond vert un peu plus lisibles.
- Bandeau de confirmation affiché un peu plus longtemps.
- Chargement : silhouettes aussi pour le Coran de l'élève, la progression, « Ce que je connais », le journal et l'invitation.

## [1.45.0] — 2026-11-17

### Ajouté

- Coran : panneau du tajwid (bouton palette en haut). Un interrupteur, des raccourcis d'un toucher (toutes, les madd, nûn et mîm, qalqala), puis chaque règle en tuile à sa couleur, avec ce qu'il faut faire et combien de fois elle revient sur la page. Le texte change en direct au-dessus. Sous le texte, la légende ne montre que les règles présentes.

### Corrigé

- Coran : en lisant la suite (sourate suivante sous la page), le titre du haut suit la sourate affichée (il restait sur la première).
- Mushaf : une seule taille de texte pour toutes les pages (elle changeait d'une page à l'autre, et les pages 1-2 étaient énormes) ; une ligne un peu plus longue est resserrée, elle seule.

### Amélioré

- Lecteur : le nom du récitateur s'affiche en entier (plus de phrase d'aide au repos).
- Vue page : le sélecteur montre la sourate de la page (l'en-tête dit déjà « Page · Juz »).
- Tajwid : les couleurs les plus pâles (lettres muettes, idghâm sans ghunna, iqlâb…) sont un peu plus foncées sur fond clair.

## [1.44.1] — 2026-11-16

### Corrigé

- Réciter en Warsh : plus d'un verset sur quatre (1 690 sur 6 214, dont presque toutes les sourates Al-Isra, Al-Kahf, Maryam, Al-Furqan, Al-Ahzab) échouait avec « L'analyse a échoué ». Le texte Warsh du Complexe du Roi Fahd écrit le tanwîn « ouvert » avec d'autres caractères que ceux attendus par le moteur : ils sont maintenant convertis. Il ne reste que quelques graphies rares.

### Ajouté

- Banc d'essai du moteur sur trois récitateurs Warsh de référence, et un test qui vérifie que chaque verset Warsh se lit (idée tirée du travail de Yousr Allouani sur le Warsh).

## [1.44.0] — 2026-11-16

### Ajouté

- Coran, vue page (Hafs) : les pages sont celles du Mushaf de Médine, ligne pour ligne (mêmes coupures que le livre). Chaque ligne tient sur la largeur de l'écran ; les lignes courtes (pages 1-2, fins de sourate) sont centrées au lieu d'être étirées. En vue page, la taille du texte s'ajuste d'elle-même à la largeur.
- Coran : mode caché pour réviser (bouton œil du lecteur). Seul le premier mot de chaque ligne (ou de chaque verset) reste lisible ; un toucher dévoile une ligne. « Réciter » lancé depuis le mode caché dévoile les mots au fil de la récitation, et en vue page il propose toute la page.
- Tajwid : chaque règle s'allume ou s'éteint d'un toucher dans la légende (par exemple seulement la qalqala) ; choix retenu sur l'appareil.

## [1.43.1] — 2026-11-16

### Corrigé

- Coran, plein écran : le bouton « Quitter » se place au-dessus de la page (plus sur le texte) et s'efface après 3 s, un toucher le fait revenir ; plus le long message d'Android à chaque entrée ; en Mushaf, la page remplit l'écran.
- Coran : la suite des sourates a exactement le même style que la page ouverte (couleurs de la page, numéros de versets, cartouche).
- Coran : « Réciter » est rangé dans la barre du lecteur ; plus rien ne flotte sur les versets ni sur la légende du tajwid.
- Coran : en arrivant sur l'onglet, la page s'affiche net (elle ne paraît plus grisée un instant).

## [1.43.0] — 2026-11-16

### Ajouté

- Coran : lecture en plein écran (bouton à côté de Sourate / Mushaf). La barre du haut monte, celle du bas descend, le texte prend toute la place ; un bouton discret permet d'en sortir. Gardé en tournant les pages, quitté en sortant du Coran.

### Amélioré

- Progression : les pages du mushaf en grand (« 165,9 pages sur 604 »), les versets appris et les juz complets juste dessous.
- Réciter, pendant l'écoute : l'avis sur le son, le bouton pour finir et le temps sur une seule rangée, plus petite ; « Parle un peu plus fort » seulement pour une voix vraiment faible.

### Corrigé

- Fiche PDF : la date du jour ne déborde plus sur la colonne voisine (le trait ne la coupe plus), et plus de barre grise de défilement sur téléphone.

## [1.42.0] — 2026-11-16

### Ajouté

- « Ce que tu connais déjà » : l'élève indique ce qu'il sait par cœur (par juz, ou de sourate à sourate) et choisit s'il veut le faire écouter à son Cheikh. Proposé une fois juste après l'inscription, et une fois aux élèves déjà inscrits ; modifiable ensuite depuis la Progression. Rien de ce qui existait n'est modifié : ces parties s'ajoutent aux séances.
- Le Cheikh voit ces parties sur la progression de l'élève et dans l'écoute rapide de sa classe (« Écouté », « Validé ») quand l'élève veut les lui faire écouter.
- Inviter : « Partager le lien d'inscription » (le lien est écrit dans le message, pour WhatsApp, SMS…), « Partager l'image du QR » et « Copier le lien ». L'invitation des élèves par e-mail est retirée.
- Administration : « Qui utilise le Coran » (lectures, écoutes et récitations de chacun sur 7 jours, sourates les plus ouvertes).

### Amélioré

- Progression comptée en pages du mushaf de Médine (604 pages, une page commencée compte en partie), avec les juz complets.
- Réciter : l'appli entend mieux les voix douces et les téléphones qui captent faiblement (seuil de voix plus bas, volume remonté avant l'analyse, grondement de fond filtré, début des mots mieux gardé).
- Réciter : en-tête, choix du passage et micro plus compacts ; l'historique des essais se replie : plus de versets visibles.

### Corrigé

- Le lien d'inscription utilise l'adresse du site réellement ouverte ; ouvert sur un téléphone déjà connecté, il propose de se déconnecter pour créer le compte élève (au lieu de sembler ne pas marcher).
- Progression : la liste des sourates ne dépasse plus de l'écran (texte agrandi compris).

## [1.41.0] — 2026-11-16

### Amélioré

- Fluidité :
  - les pages déjà ouvertes se rouvrent tout de suite pendant 5 minutes (puis se mettent à jour en arrière-plan) ;
  - une page déjà vue pendant la visite s'affiche net, sans rejouer ses animations d'entrée ;
  - des animations plus courtes et la même courbe partout ;
  - cartes, lignes, puces et boutons s'enfoncent dès que le doigt touche ;
  - « Continuer la lecture » est là d'emblée, sans décaler la page ;
  - au retour en arrière, la page reprend à la même position.
- Tirer pour rafraîchir sur tous les onglets (appli installée).
- L'appli se souvient : « Ma fiche » rouvre l'onglet choisi la dernière fois (apprentissage ou révision), « Ma classe » la classe choisie.
- Écoute rapide pour le Cheikh : toucher la pastille « à écouter » d'un élève (ou appui long sur sa carte) ouvre ses séances dans une feuille du bas, à marquer « Écouté » ou « Validé » sans quitter la liste.
- Administration : la barre du bas garde Admin, Élèves, Coran et Présences ; Journal, Nouveautés et Compte sont dans « Plus ».
- Champs : « Suivant » sur le clavier passe au champ d'après, les chiffres se remplacent d'un toucher, le champ reste visible au-dessus du clavier, pas de zoom sur iPhone.
- Zones de toucher un peu plus grandes (flèches des mois, liens, pastilles, croix de fermeture).

## [1.40.1] — 2026-11-16

### Corrigé

- Onglet Coran : la barre du lecteur et le bouton « Réciter » n'apparaissent plus trop haut avant de sauter à leur place ; la page arrive en fondu, puis le lecteur monte depuis le bas et « Réciter » le suit (même chose pour les pages qui ont une barre accrochée en bas : saisie d'une séance, appel).

## [1.40.0] — 2026-11-16

### Amélioré

- En-tête quand on descend, sur toutes les pages : barre en verre dépoli (le contenu glisse dessous en s'estompant), fil doré qui s'efface vers les bords.
- Le grand titre rétrécit et s'efface en descendant ; le petit titre arrive à sa place avec un sous-titre utile (élèves et séances à écouter, mois et onglet de la fiche, sourate ou page du Coran, avancement de la progression, rôle sur « Mon compte »).
- Un toucher sur la barre remonte en haut de la page : le logo fait un tour, une flèche l'indique.
- Ma classe : la courbe des 14 derniers jours, plus petite, se place à droite du nom et n'apparaît que si l'élève a travaillé ; les chiffres tiennent sur une ligne (icône et valeur, sans les zéros).

## [1.39.0] — 2026-11-16

### Ajouté

- Fiche de l'élève :
  - une carte « Aujourd'hui » avec l'apprentissage et la révision du jour en grand (saisie ou à saisir) ;
  - la régularité du mois en anneau, le temps, les versets, la série de jours d'affilée (une flamme) et les objectifs en tuiles ;
  - le dernier mot du Cheikh, en carte dorée, avec un lien vers la séance.
- Semaines : celle en cours ressort ; chaque semaine montre 7 points (un par jour, à la couleur de l'écoute du Cheikh) et ses jours travaillés.
- Jours : la durée en pastille et un liseré à la couleur de l'écoute du Cheikh. Le bilan du mois passe en tuiles illustrées.
- Progression : l'avancement en grand anneau doré, avec une phrase d'encouragement.
- Carte du Coran : toucher une sourate ouvre son détail (part apprise, dernière fois, « Lire », « Réviser cette sourate »).
- Graphiques : dégradés, et une bulle donne la valeur au toucher (semaine, mois, jour).
- Onglet Coran : une carte « Continuer la lecture » rouvre la dernière page lue.
- Ma classe : une petite courbe des 14 derniers jours sur la carte de chaque élève.
- Appel : avatars, jauge des présents qui suit les choix, boutons « Présent / Absent » plus francs.
- Mon compte : carte de profil avec la mosquée, la classe et son Cheikh, et la date d'inscription.
- Bienvenue (après le QR code) : le logo fête l'arrivée et les premiers pas sont expliqués en trois étapes.
- QR code de la classe : « Afficher en grand » le montre en plein écran sur fond blanc, avec le nom de la classe, et l'écran reste allumé ; le message de partage précise la classe.

### Amélioré

- Barre du bas : icônes dessinées pour l'appli (carnet, mushaf sur son pupitre, mosquée…) ; la page arrive du côté de l'onglet touché.
- Écran de connexion : des étincelles dorées, la boîte qui arrive en douceur.
- Avatars en léger relief, avec l'étoile du logo en filigrane.
- Feuilles du bas : elles montent avec un léger ressort et se ferment en les tirant vers le bas par la poignée.
- Léger effet de profondeur au défilement (en-tête et motifs).
- Mode sombre : une lueur en haut de l'écran et des cartes en relief.

### Corrigé

- Mushaf : le glissement d'une page à l'autre suit le doigt sans à-coups ; un geste vif suffit pour tourner la page.

## [1.38.0] — 2026-11-16

### Ajouté

- L'élément touché s'ouvre en page : la carte d'un élève ou le jour d'une fiche s'agrandit jusqu'à remplir l'écran, puis la page apparaît ; au retour, l'écran se referme vers la carte.
- Barre du bas : la pastille de l'onglet actif glisse d'un onglet à l'autre, l'icône active se remplit légèrement.
- Choix en segments (Sourate / Mushaf, Lecture seule / Modifier, Thème, Taille du texte, Hafs / Warsh, Aller à) : le fond de l'option choisie glisse.
- En-tête compact : quand la grande barre du haut quitte l'écran, une barre fine (logo et titre, sur verre dépoli) glisse depuis le haut ; un toucher remonte en haut de la page.
- Mushaf : la page suit le doigt avec un léger pivot, part, et la nouvelle arrive de l'autre côté (aussi avec les flèches).
- Enregistrer : une coche se dessine (« Enregistrée » sur la ligne du jour, « Enregistré » sur les objectifs et le bilan).
- Chargements à la forme des pages (fiche, listes) avec un reflet doré ; écrans vides avec une étoile qui se dessine puis flotte ; un reflet d'or traverse de temps en temps l'en-tête.
- Tirer pour rafraîchir : l'étoile du logo se dessine à mesure qu'on tire, puis tourne.
- Notifications : elles glissent depuis le haut, l'icône apparaît avec un petit ressort, une fine barre montre le temps qui reste, puis elles remontent.

### Amélioré

- Mêmes arrondis et mêmes ombres pour les cartes et les boutons de toute l'appli.

## [1.37.0] — 2026-11-16

### Corrigé

- Mode révision : la barre d'état du téléphone (tout en haut de l'écran) passe bien à l'or ; elle restait verte sur la fiche.
- Ouverture de l'appli : l'animation part du logo tel que l'écran de démarrage du téléphone le montre, au lieu de le redessiner depuis rien.
- Texte « très grand » : la barre du bas ne dépasse plus de l'écran.

### Ajouté

- Animations dans l'appli :
  - les chiffres (jours travaillés, versets, versets appris, sourates, jours d'affilée) montent jusqu'à leur valeur ;
  - les tuiles et les chiffres du résumé arrivent avec un petit ressort ;
  - l'anneau du Coran se trace, la courbe des versets se dessine, les barres du temps de travail poussent semaine après semaine, la régularité s'allume de gauche à droite ;
  - les 114 sourates de la carte du Coran apparaissent en vague ;
  - le jour d'aujourd'hui s'illumine doucement sur la fiche ;
  - les cartes des élèves arrivent l'une après l'autre (Cheikh) ;
  - dans l'onglet Coran, « Réciter » respire pour inviter à essayer.

## [1.36.0] — 2026-11-16

### Corrigé

- Passage apprentissage ↔ révision : plus d'attente de plusieurs secondes ni d'écran figé. Au toucher, toute l'appli prend la nouvelle couleur tout de suite (vague depuis le doigt) et l'onglet choisi s'allume aussitôt ; la fiche se charge en même temps.
- Plus de rectangle bleu d'Android sur les onglets et les jours : l'élément touché réagit lui-même (il s'enfonce légèrement et s'éclaire).
- La flèche des semaines passe aussi à l'or en révision (elle restait verte).

### Amélioré

- Appuis plus vivants : onglets, jours de la fiche, liens ; l'icône de l'onglet du bas fait un petit rebond en arrivant sur la page ; les cartes des semaines arrivent l'une après l'autre.

## [1.35.0] — 2026-11-16

### Amélioré

- Mode révision : sur la fiche de révision et la saisie d'une séance de révision, toute l'appli passe à l'or (en-tête, fond, barre du bas, boutons, liens, et la barre d'état du téléphone). Ailleurs, l'appli reste verte. En mode sombre aussi.
- Passage apprentissage ↔ révision : la nouvelle couleur se répand en cercle depuis l'onglet touché, sur tout l'écran, sans clignotement (transition de vue du navigateur). Même effet en glissant sur les onglets. Sur un téléphone qui ne la connaît pas, ou avec « réduire les animations », le changement est direct.
- Écran de démarrage plus abouti (environ 2,5 s) : l'étoile se dessine en or trait par trait, le calame trace le ق qui apparaît sous lui, un reflet doré traverse la lettre, le nom apparaît ; un court temps figé pour voir le logo, puis il file vers sa place dans l'en-tête. Un appui le passe toujours.

## [1.34.0] — 2026-11-16

### Amélioré

- Fiche : l'apprentissage et la révision ont chacun leur couleur. L'apprentissage garde le vert de l'appli ; la révision est teintée d'or (onglet, flèches du mois, cartes des semaines, résumés, boutons), sans toucher à l'en-tête, à la barre du bas ni au fond. La saisie d'une séance prend la couleur de sa fiche.
- En passant d'une fiche à l'autre, les couleurs glissent doucement de l'une à l'autre, le curseur de l'onglet ouvert glisse vers la fiche choisie et le contenu arrive par le côté. Avec « réduire les animations », tout change sans mouvement.

## [1.33.2] — 2026-11-15

### Amélioré

- Lecture du Coran : le bouton « Réciter » sort de la barre d'écoute et flotte juste au-dessus, à droite, toujours visible. La barre retrouve la place pour le nom du récitateur et ce qu'elle fait (lecture, chargement…).
- Fiche : les onglets n'affichent plus de nombre ; icônes plus parlantes (un livre « + » pour l'apprentissage, une flèche de retour pour la révision), qui ne s'écrasent plus avec un grand texte.

## [1.33.1] — 2026-11-15

### Amélioré

- Fiche : la fiche de révision se remarque. Les onglets « Apprentissage » et « Révision » ont chacun leur icône et leur couleur (vert, or) ; celui qui est ouvert est coloré, et chacun montre le nombre de séances du mois.

## [1.33.0] — 2026-11-15

### Ajouté

- Administration, état du site : un bouton « Réglé » sur chaque erreur. Une fois le bug corrigé, l'erreur quitte le tableau ; si le bug revient, elle réapparaît.
- Les erreurs identiques sont réunies (« 3 fois »), avec les pages concernées.

## [1.32.0] — 2026-11-15

### Amélioré

- Mode Réciter, suivi en direct beaucoup plus rapide : le téléphone écoute lui-même où en est l'élève (un modèle de 23 Mo, téléchargé une fois puis gardé), environ une demi-seconde après chaque mot au lieu de 2 à 4 secondes. Le jugement (fautes, madd, ghunna…) reste fait par le serveur, avec la double écoute. Si le téléphone est trop lent, ou avec l'économiseur de données, le serveur continue de suivre comme avant.
- On voit mieux où on en est : les mots déjà dits sur fond vert pâle, le mot que l'appli vient d'entendre encadré en vert, le mot suivant souligné en doré qui clignote ; le texte défile tout seul.
- Couleurs du tajwid : l'idghâm sans ghunna a une couleur bien distincte de l'idghâm avec ghunna.

### Ajouté

- Izhâr en couleur (lecture et mode Réciter, Hafs) : le nûn sakin et le tanwîn devant une lettre de la gorge (ء ه ع ح غ خ).
- Détection de l'izhâr dans le mode Réciter : noun caché (ikhfâ' à tort), noun nasalisé (ghunna à tort) ou noun non prononcé.

## [1.31.1] — 2026-11-15

### Corrigé

- Lecture du Coran sur téléphone : la barre du bas (lecture, « Réciter », réglages) dépassait de son cadre depuis l'ajout du libellé « Réciter ». Elle tient de nouveau entière à l'écran.

## [1.31.0] — 2026-11-15

### Ajouté

- **Responsable de mosquée** : une casquette en plus sur un compte de Cheikh, donnée (ou retirée) par l'administrateur depuis le menu ⋯ d'un utilisateur. Dans sa mosquée seulement, le responsable invite des Cheikhs et des élèves, crée les classes, y place les élèves et fait l'appel. Nouvel onglet « Mosquée » : classes, Cheikhs et élèves sans classe en un coup d'œil. L'administrateur garde la main sur tout.
- **Onglet « Coran » pour les élèves**, avec deux cartes :
  - « Réciter » : le passage de la dernière séance, les derniers scores et les mots à revoir, et un bouton pour le réciter tout de suite ;
  - « Lire et écouter » : le Coran dans la lecture de l'élève (Hafs ou Warsh), avec le récitateur de son choix, la répétition et l'écoute hors connexion.
- Séance de l'élève : un bouton « Réciter » à côté de chaque passage.
- La voix n'est jamais enregistrée : seuls le score et les mots à revoir sont gardés.

### Amélioré

- Lecture du Coran : le bouton du micro s'appelle maintenant « Réciter », pour qu'on le trouve.

## [1.30.3] — 2026-11-15

### Amélioré

- Pages instantanées et toujours à jour : une page déjà vue s'affiche tout de suite, puis se met à jour toute seule en arrière-plan. Ce qu'une autre personne a changé entre-temps apparaît en moins d'une seconde, sans rien toucher. Pareil en revenant sur l'appli après 30 secondes ailleurs.

## [1.30.2] — 2026-11-15

### Amélioré

- Plus de fluidité : une page déjà vue se rouvre instantanément pendant 2 minutes (au lieu de 30 s), et les fiches des premiers élèves de la liste sont préparées d'avance.
- Écran d'une séance et fiche d'un élève (Cheikh) : les droits, l'élève et la séance sont demandés en même temps à la base, au lieu de l'un après l'autre.
- Commentaire du Cheikh : il s'affiche tout de suite, pendant son envoi.

## [1.30.1] — 2026-11-15

### Corrigé

- Réactivité retrouvée : les mesures de vitesse et le signalement de l'appareil, ajoutés en 1.30.0, passaient dans la même file d'attente que la navigation et retardaient chaque changement de page. Ils partent maintenant à côté, sans rien retarder.
- Vue du Cheikh (admin) : le passage de « Lecture seule » à « Modifier » est immédiat.
- Séance : « + Ajouter une note » et « Le passage continue sur la sourate suivante ? » ont retrouvé une vraie apparence (ils s'affichaient en gros boutons gris).

## [1.30.0] — 2026-11-15

### Nouveautés

- Mode Réciter : « Révéler » cache le texte, et chaque mot apparaît une fois récité. On voit ses essais précédents sur le passage (62 % → 75 % → 88 %) et ses mots difficiles, à reprendre d'un appui. Le récitateur de référence se choisit sur place.
- Lecture du Coran en continu : en faisant défiler, la sourate suivante s'ajoute dessous. Sur un verset : « Écouter ×3 » et « Écouter ×5 ».
- Mon compte : thème clair ou sombre au choix, et taille du texte de toute l'appli (normale, grande, très grande).
- Administration : chaque mosquée montre sa courbe des 8 dernières semaines, sa régularité et ses élèves en baisse.
- Journal : rubrique Sécurité (connexion depuis un nouvel appareil, mots de passe erronés) et Vitesse réelle (temps d'affichage mesurés sur les téléphones).

### Amélioré

- Fiche : l'en-tête d'une semaine réagit comme un vrai bouton (enfoncement, flèche, petite vibration).
- Administration : l'état du site tient en une ligne verte quand tout va bien.
- Chaque sourate ouverte, et la suivante, reste lisible sans réseau.
- Les mises à jour s'appliquent à la prochaine ouverture de l'appli, jamais pendant qu'on lit ou qu'on récite.
- Le mode Réciter n'est chargé qu'au premier appui : la page du Coran s'ouvre plus vite.
- Next.js passe en version 16 ; tests visuels de l'apparence (captures comparées à chaque changement).

## [1.29.0] — 2026-11-14

### Nouveautés

- Administration : page « Nouveautés » qui raconte ce qui a changé, version par version.
- Un compte sans prénom (« Sans nom ») est invité une fois à l'écrire.

### Amélioré

- Administration : la version en ligne s'affiche clairement (« 1.29.0 · mise en ligne aujourd’hui à 23:10 ») au lieu du message technique.
- Journal : les ouvertures successives d'une même personne sont regroupées (« a ouvert l’appli 6 fois », de 16:35 à 19:46).
- Graphique des séances : il commence à la première semaine active, avec le chiffre de la semaine en grand.
- Titres des cartes : ils ne se cassent plus sur téléphone ; le compteur passe dessous si besoin.
- Beauté : motif géométrique discret dans l'en-tête et l'écran d'ouverture, nom de la sourate en calligraphie dans le mode Réciter, une seule échelle de tailles de texte, mode sombre plus doux (moins noir, alertes moins criardes).
- Animations légères : les cartes glissent en place, la coche se dessine et le téléphone vibre quand le Cheikh valide une séance.

## [1.28.3] — 2026-11-14

### Corrigé

- Une page qui plantait juste après une mise en ligne (appli restée ouverte sur l'ancienne version, erreur « e[o] is not a function ») se recharge maintenant toute seule dans la nouvelle version, sans écran d'erreur.

## [1.28.2] — 2026-11-14

### Corrigé

- Administration : les erreurs rencontrées s'affichent en entier sur téléphone (date, page, message complet) au lieu d'un tableau coupé.
- Une erreur signalée indique aussi la version de l'appli chargée sur le téléphone et l'endroit du code concerné, pour en trouver la cause.

## [1.28.1] — 2026-11-14

### Corrigé

- Journal et liste des utilisateurs : la dernière visite donne l'heure (« hier à 21:14 », « lundi à 09:05 », « aujourd’hui à 18:00 ») au lieu d'un simple « hier » ou « il y a 4 j ».

## [1.28.0] — 2026-11-14

### Nouveautés

- Mode Réciter : le texte est coloré selon les règles du tajwid (madd, ghunna, ikhfaʾ, idgham, iqlab, qalqala, lettres non prononcées), avec la légende des couleurs présentes dans le passage. Après la récitation, les couleurs restent : les fautes sont encadrées (rouge, ou doré pour « à revoir »). Un bouton masque les couleurs, et ce choix est retenu sur l'appareil. Disponible en Hafs.

## [1.27.0] — 2026-11-14

### Amélioré

- Sur iPhone, le geste retour ferme la feuille ou le mode Réciter ouverts au lieu de quitter la page (Android le faisait déjà).
- Une fine barre apparaît en haut de l'écran dès qu'on touche un lien : on voit tout de suite que la page suivante arrive.
- Lecture du Coran : pendant le chargement, des lignes de texte s'affichent à la place du gros bloc vide.
- Mode Réciter : la taille du texte arabe est la même que dans la lecture du Coran, et se règle sur place (A− / A+).
- Présences : les écrans vides disent quoi faire (créer la première classe, ajouter des élèves) avec le bouton qui va avec.

## [1.26.0] — 2026-11-14

### Amélioré

- Mode Réciter : quand l'appli n'est pas sûre d'une remarque, elle le dit. Le mot est souligné en pointillés (« à vérifier »), à part des fautes sûres, avec le conseil d'écouter et de comparer avec le récitateur.
- Mode Réciter : un résultat qui guide. On voit d'abord le nombre de mots à reprendre, puis on peut les réécouter à la suite avec sa propre voix, ou reprendre directement le verset où il y a le plus de fautes.
- Mode Réciter : on sait toujours ce que fait l'appli (préparation, écoute, analyse, réseau lent, connexion perdue). Un envoi qui échoue est réessayé tout seul quand le réseau revient : la récitation n'est plus perdue.

## [1.25.0] — 2026-11-14

### Nouveautés

- Vérification du tajwid : l'appli apprend des signalements « L’appli s’est trompée ». Une remarque signalée par un Cheikh, par l'admin ou par deux élèves n'est plus faite sur ce mot. L'admin voit ces corrections apprises dans le Journal et peut en refuser une.
- Madd naturel mesuré à l'horloge, au rythme de chaque élève : beaucoup moins de « madd oublié » à tort, et un madd tenu trop longtemps est désormais signalé. Sur le banc d'essai : 10 % de fausses remarques en moins, et 21 madd naturels fautifs repérés sur 27, au lieu de 7.

### Amélioré

- Le modèle est installé avec l'appli : la première vérification démarre plus vite (plus de téléchargement à froid).
- Même enregistrement, même verdict : les calculs du modèle sont rendus reproductibles.
- Banc d'essai élargi : 58 versets récités par 3 récitateurs de référence, en plus des 159 élèves annotés.

## [1.24.0] — 2026-11-14

### Amélioré

- Vérification du tajwid plus précise : chaque morceau est écouté par les deux versions du modèle et une remarque n'est faite que si les deux l'entendent. Sur le banc d'essai (159 élèves annotés) : 11 % de fausses remarques en moins et davantage de vraies fautes repérées (qalqala, ghunna). La réponse prend environ 0,3 s par morceau au lieu de 0,1 s.
- Mode Réciter : les numéros des versets restent affichés pendant la récitation et dans le résultat.

## [1.23.0] — 2026-11-14

### Nouveautés

- Mode Réciter : suivi en direct. Toutes les 2 secondes, les mots déjà récités s'allument ; le jugement du tajwid arrive toujours à chaque pause, sur le morceau entier.
- Administration (Journal) : les signalements « L’appli s’est trompée », classés par règle, pour régler la vérification en priorité là où elle se trompe le plus.

### Amélioré

- Précision : le son du micro est ramené à 16 kHz par le navigateur (conversion de qualité) au lieu d'un filtre simple qui pouvait déformer certaines lettres.

## [1.22.0] — 2026-11-14

### Nouveautés

- Coran : mode « Réciter » en plein écran (bouton micro de la barre, ou « Vérifier ma récitation à partir d’ici » sur un verset). On choisit les versets, on récite d'affilée ; chaque morceau est analysé dès la première pause, pendant qu'on continue, si bien que le résultat arrive presque aussitôt après le dernier mot.
- Le rythme de l'élève est mesuré sur toute la récitation : les madd sont jugés par rapport à sa propre vitesse.
- Avis sur le son pendant la récitation (« Son parfait », « Parle un peu plus fort », « Endroit bruyant »…), silences retirés avant l'analyse.
- Résultat : score, pastilles, mots colorés ; sur un mot, la remarque, « Toi » (réécouter ce mot dans ta récitation) et « Récitateur » (le verset), et « L’appli s’est trompée » (seuls le mot et la règle sont gardés, pour régler la vérification).
- Le moteur se prépare dès l'ouverture du mode Réciter.
- Précision réglée sur un banc d'essai de 159 récitations d'apprenants annotées par des enseignants : seuils de confiance relevés (moins de fausses remarques), longueur du madd naturel plus jugée (plus souvent reprochée à tort qu'à raison) ; le modèle complet n'y faisant pas mieux, le modèle compact (plus rapide) est gardé. Analyse d'un morceau : environ 0,2 s sur le serveur.

## [1.21.0] — 2026-11-14

### Nouveautés

- Coran : « Vérifier ma récitation » corrige maintenant le tajwid. Tu récites le verset (30 s au plus), notre serveur l'analyse avec un modèle ouvert spécialisé (HisnLabs Tajweed v2) et dit pour chaque mot s'il est juste, à revoir, faux ou oublié, avec la remarque en français (madd trop court ou trop long, ghunna, ikhfaʾ, iqlab, idgham, chadda, qalqala, mauvaise lettre ou voyelle). Score, compteurs, réécoute de sa récitation, et « Masquer le texte » pour réciter de mémoire. Hafs et Warsh ; rien n'est enregistré, la voix ne passe plus par Google ou Apple.

## [1.20.0] — 2026-11-14

### Nouveautés

- Coran : « Vérifier ma récitation » dans la fiche d'un verset. Le téléphone transcrit ta voix et l'appli la compare au texte, mot à mot : juste en vert, différent en doré, oublié barré, avec le nombre de mots justes. La transcription passe par le service vocal du téléphone (expliqué la première fois) ; rien n'est gardé dans l'appli.
- Séance : sous chaque passage validé par le Cheikh, l'élève voit la date (« validé le 12 nov. »).

### Amélioré

- Base : index pour les lectures fréquentes (statistiques d'une période, journal filtré par personne, suppression d'un Cheikh).
- Code : formats de date et noms des rôles regroupés en un seul endroit, avertissements corrigés.
- Administration : l'onglet « Classes » devient « Élèves » (tous les élèves d'une mosquée), pour ne plus confondre classe et établissement.
- Téléphone : les boutons touchés souvent (appel, écoute du Cheikh, durées, retour, annuler) font au moins 44 px de haut.
- Tests : création d'une classe depuis l'administration, vérification de la récitation, mesure de la navigation entre onglets corrigée.

## [1.19.0] — 2026-11-14

### Nouveautés

- Administration : chaque mosquée affiche ses classes (Cheikhs, nombre d'élèves, jours), avec « + Nouvelle classe » ; « Voir la classe » devient « Voir les élèves » (toute la mosquée).
- Invitation d'un Cheikh : on choisit sa mosquée puis sa classe ; à sa première connexion, il en devient le Cheikh.
- Chaque mosquée qui avait des Cheikhs mais pas encore de classe reçoit une « Classe de test » avec tous ses Cheikhs et ses élèves.

## [1.18.0] — 2026-11-13

### Amélioré

- Administration épurée : l'état du site en trois voyants, chaque établissement en une carte avec sa jauge d'activité et ses alertes, la création d'établissement et les invitations en attente repliées.
- Comptes : une ligne par personne (rôle, établissement, dernière visite « il y a 2 h »), les actions rangées dans le menu « ⋯ ».
- Journal : « Qui utilise l'appli » avec un voyant d'activité, et les actions en phrases simples (« Inès a modifié une séance »), regroupées par jour ; les filtres sont repliés.
- Séance : les phrases toutes prêtes du commentaire sont retirées ; le menu « ⋯ » s'ouvre vers la gauche pour rester dans l'écran.

## [1.17.0] — 2026-11-13

### Amélioré

- Écran de séance épuré : en-tête sur une ligne, un seul bouton principal « Enregistrer », suppression rangée dans le menu « ⋯ ».
- Élève : durée en un toucher (10, 15, 20, 30 min ou « Autre »), un passage par ligne qu'on touche pour le modifier, avec son état ; note ajoutée seulement si besoin ; le mot du Cheikh apparaît sous les passages.
- Cheikh : la récitation et le commentaire en premier, avec des phrases toutes prêtes ; la saisie de l'élève est résumée en une ligne, avec un bouton « Modifier ».

## [1.16.0] — 2026-11-13

### Nouveautés

- Progression : chaque sourate a une jauge en trois couleurs, saisi (gris), écouté (vert) et validé (or), avec sa légende.

### Amélioré

- Mêmes couleurs partout pour l'écoute du Cheikh : gris = à écouter, vert = écouté, or = validé (fiche du mois, passages, progression, PDF) ; le mot ou le ✓ reste toujours écrit.
- Pastilles plus courtes (« ✓ Validé », « Écouté », « À écouter ») ; le détail est dans la légende et en bulle d'aide.
- Plus aucun emoji dans l'appli ; casque au trait fin dans les boutons du Cheikh.

## [1.15.0] — 2026-11-13

### Nouveautés

- Deux étapes du Cheikh pour chaque passage : **« Écouté »** (récité devant lui, à retravailler) puis **« Validé »** (acquis). Dans la séance, le Cheikh choisit l'état de chaque passage d'un toucher, ou « Tout écouté » / « Tout validé ». Il peut revenir en arrière.
- L'élève voit l'état de chaque passage ; sur la fiche du mois : 🎧 Écouté, ✓ Validé ou « Ajout à écouter ». Le bouton ✓ de la fiche valide toute la séance.
- Progression : les versets validés sont comptés à part (« dont X validés, Y écoutés ») ; une sourate entièrement validée porte « ✓ Validée ». Fiche PDF : séances validées et signes 🎧 / ✓.

### Changé

- Les anciennes marques « Vu par le Cheikh » deviennent « Écouté » : rien n'est validé d'office.

## [1.14.0] — 2026-11-13

### Nouveautés

- Suivi du Coran : chaque Cheikh ne voit et ne corrige que les élèves de **ses** classes. Un élève qui n'est dans aucune classe (ou seulement dans une classe sans Cheikh) reste visible par les Cheikhs de sa mosquée, le temps de le placer.
- Un Cheikh qui a plusieurs classes passe de l'une à l'autre par des onglets dans « Ma classe ».
- Un élève invité par un Cheikh (e-mail ou QR code) rejoint directement sa classe ; avec plusieurs classes, le Cheikh choisit laquelle. Chaque Cheikh a son propre QR code.
- Mise à jour automatique : après une mise en ligne, l'appli se met à jour toute seule (au retour sur l'appli, au prochain lien touché, ou après 20 s sans geste), jamais pendant une saisie, une écoute ou une fenêtre ouverte.

### Amélioré

- Réactivité : vérification de la connexion sans aller-retour réseau quand c'est possible ; plus aucun appel à la base pour les polices, icônes et fichiers fixes ; écran d'attente immédiat dans les présences.

### Corrigé

- Après l'appel, le retour sur la classe pouvait rester bloqué sur la page de l'appel.
- « Aller à » (sourate, marque-page) : si l'ouverture dans l'appli n'aboutit pas, la page s'ouvre normalement au bout de 3 secondes au lieu de rester sans réponse.

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
