/*
 * Service worker de « Suivi Coran » : l'appli reste utilisable sans réseau.
 *
 * - Fichiers de l'appli (/_next/static, icônes, polices) : gardés après le premier
 *   chargement (leur nom change à chaque version, ils ne sont jamais périmés).
 * - Pages de l'élève et du Cheikh : toujours demandées au serveur ; la dernière version
 *   reçue est gardée pour être réaffichée sans réseau (en salle de cours qui capte mal).
 *   Une séance saisie hors ligne part toute seule au retour du réseau, et la base refuse
 *   d'écraser une séance modifiée entre-temps : une page un peu ancienne ne fait rien perdre.
 * - Déconnexion (retour sur /connexion) : les pages gardées sont effacées.
 * - Page jamais ouverte et pas de réseau : page « Pas de connexion ».
 */
const STATIQUE = "suivi-coran-statique-v1";
const PAGES = "suivi-coran-pages-v1";
const HORS_LIGNE = "suivi-coran-hors-ligne-v1";
const PAGE_HORS_LIGNE = "/hors-ligne.html";
const MAX_PAGES = 40;
const CACHES_CONNUS = [STATIQUE, PAGES, HORS_LIGNE];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(HORS_LIGNE).then((cache) => cache.add(PAGE_HORS_LIGNE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(cles.filter((c) => !CACHES_CONNUS.includes(c)).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Pages privées que l'on garde pour le hors-ligne. */
function pageGardee(url) {
  return /^\/(eleve|maitre)(\/|$)/.test(url.pathname);
}

function estConnexion(url) {
  return url.pathname === "/connexion" || url.pathname.startsWith("/connexion/");
}

async function limiterPages(cache) {
  const cles = await cache.keys();
  await Promise.all(cles.slice(0, Math.max(0, cles.length - MAX_PAGES)).map((c) => cache.delete(c)));
}

async function garderPage(requete, reponse) {
  const cache = await caches.open(PAGES);
  await cache.delete(requete, { ignoreVary: true });
  await cache.put(requete, reponse);
  await limiterPages(cache);
}

async function pageSansReseau(requete, url) {
  const cache = await caches.open(PAGES);
  // La même page (même jour, même mois) ; à défaut, pour la fiche et l'accueil, la dernière
  // version de cette page (un autre mois affiché vaut mieux que rien). Jamais pour une séance :
  // le formulaire d'un autre jour serait trompeur.
  const exacte = await cache.match(requete, { ignoreVary: true });
  if (exacte) return exacte;
  if (!url.pathname.endsWith("/seance")) {
    const proche = await cache.match(requete, { ignoreSearch: true, ignoreVary: true });
    if (proche) return proche;
  }
  return (await caches.match(PAGE_HORS_LIGNE)) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers de l'appli : nom unique par version, on les garde.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/")) {
    event.respondWith(
      caches.open(STATIQUE).then(async (cache) => {
        const garde = await cache.match(requete);
        if (garde) return garde;
        const reponse = await fetch(requete);
        if (reponse.ok) cache.put(requete, reponse.clone());
        return reponse;
      }),
    );
    return;
  }

  // Une page entière : ouverture de l'appli, lien, ou page préparée pour le hors-ligne.
  const ouverture = requete.mode === "navigate";
  const preparation = requete.headers.get("X-Suivi-Hors-Ligne") === "1";
  if (!ouverture && !preparation) return;

  event.respondWith(
    fetch(requete)
      .then((reponse) => {
        const finale = new URL(reponse.url || requete.url);
        if (estConnexion(url) || estConnexion(finale)) {
          // Déconnecté (ou session expirée) : plus rien de privé dans le téléphone.
          caches.delete(PAGES);
        } else if (reponse.ok && !reponse.redirected && pageGardee(url)) {
          event.waitUntil(garderPage(new Request(url.href), reponse.clone()));
        }
        return reponse;
      })
      .catch(() => (ouverture ? pageSansReseau(new Request(url.href), url) : Response.error())),
  );
});
