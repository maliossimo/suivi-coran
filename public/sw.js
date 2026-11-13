/*
 * Service worker de « Suivi Coran » : l'appli reste utilisable sans réseau.
 *
 * - Fichiers de l'appli (/_next/static, icônes, polices) : gardés après le premier
 *   chargement (leur nom change à chaque version, ils ne sont jamais périmés).
 * - Pages de l'élève, du Cheikh, de l'administration et des présences : toujours demandées au serveur ;
 *   la dernière version reçue est gardée pour être réaffichée sans réseau.
 *   Une séance saisie hors ligne part toute seule au retour du réseau, et la base refuse
 *   d'écraser une séance modifiée entre-temps : une page un peu ancienne ne fait rien perdre.
 * - Ouverture de l'appli sans réseau (« / ») : la dernière page d'accueil reçue
 *   (fiche de l'élève, classe du Cheikh, administration).
 * - Coran : les sourates préparées pour le hors-ligne sont gardées à part (pas de limite),
 *   et les récitations téléchargées sont servies depuis le téléphone (/coran-hors-ligne/…).
 * - Déconnexion (retour sur /connexion) : les pages gardées sont effacées.
 * - Page jamais ouverte et pas de réseau : page « Pas de connexion ».
 */
const STATIQUE = "suivi-coran-statique-v1";
const PAGES = "suivi-coran-pages-v1";
const CORAN = "suivi-coran-texte-v1";
const AUDIO = "suivi-coran-audio-v1";
const HORS_LIGNE = "suivi-coran-hors-ligne-v1";
const PAGE_HORS_LIGNE = "/hors-ligne.html";
const ACCUEIL = "/__accueil";
const MAX_PAGES = 40;
const CACHES_CONNUS = [STATIQUE, PAGES, CORAN, AUDIO, HORS_LIGNE];

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
  return /^\/(eleve|maitre|admin|compte|presences)(\/|$)/.test(url.pathname);
}

/** Pages d'accueil de chaque rôle : réaffichées quand l'appli s'ouvre sans réseau. */
function estAccueil(url) {
  return ["/eleve", "/maitre", "/admin"].includes(url.pathname) && !url.search.includes("classe=");
}

const estCoran = (url) => url.pathname === "/admin/coran";

function estConnexion(url) {
  return url.pathname === "/connexion" || url.pathname.startsWith("/connexion/");
}

async function limiterPages(cache) {
  const cles = await cache.keys();
  await Promise.all(cles.slice(0, Math.max(0, cles.length - MAX_PAGES)).map((c) => cache.delete(c)));
}

async function garderPage(requete, recue, url) {
  // Une réponse « redirigée » ne peut pas resservir une navigation : on la recopie.
  const reponse = recue.redirected
    ? new Response(await recue.blob(), { status: recue.status, headers: recue.headers })
    : recue;
  if (estCoran(url)) {
    const cache = await caches.open(CORAN);
    await cache.put(requete, reponse);
    return;
  }
  const cache = await caches.open(PAGES);
  await cache.delete(requete, { ignoreVary: true });
  if (estAccueil(url)) await cache.put(new Request(ACCUEIL), reponse.clone());
  await cache.put(requete, reponse);
  await limiterPages(cache);
}

async function pageSansReseau(requete, url) {
  if (estCoran(url)) {
    const sourate = await caches.match(requete, { ignoreVary: true, cacheName: CORAN });
    if (sourate) return sourate;
    const visitee = await caches.match(requete, { ignoreVary: true, cacheName: PAGES });
    return visitee || (await caches.match(PAGE_HORS_LIGNE)) || Response.error();
  }
  const cache = await caches.open(PAGES);
  // La même page (même jour, même mois) ; à défaut, pour la fiche et l'accueil, la dernière
  // version de cette page (un autre mois affiché vaut mieux que rien). Jamais pour une séance :
  // le formulaire d'un autre jour serait trompeur.
  const exacte = await cache.match(requete, { ignoreVary: true });
  if (exacte) return exacte;
  const formulaireDuJour = url.pathname.endsWith("/seance") || url.pathname.endsWith("/appel");
  if (!formulaireDuJour) {
    const proche = await cache.match(requete, { ignoreSearch: true, ignoreVary: true });
    if (proche) return proche;
  }
  // Ouverture de l'appli (ou raccourci de l'icône) : la dernière page d'accueil.
  if (!formulaireDuJour) {
    const accueil = await cache.match(ACCUEIL);
    if (accueil) return accueil;
  }
  return (await caches.match(PAGE_HORS_LIGNE)) || Response.error();
}

/** Récitation téléchargée : servie depuis le téléphone, par morceaux si le lecteur le demande. */
async function fichierTelecharge(requete) {
  const garde = await caches.match(new URL(requete.url).pathname, { cacheName: AUDIO });
  if (!garde) return new Response("Pas téléchargé", { status: 404 });
  const plage = requete.headers.get("range");
  if (!plage) return garde;
  const octets = await garde.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(plage);
  const total = octets.byteLength;
  const debut = m && m[1] ? Number(m[1]) : 0;
  const fin = m && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
  if (debut >= total || debut > fin) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
  }
  return new Response(octets.slice(debut, fin + 1), {
    status: 206,
    headers: {
      "Content-Type": garde.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${debut}-${fin}/${total}`,
      "Content-Length": String(fin - debut + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/coran-hors-ligne/")) {
    event.respondWith(fichierTelecharge(requete));
    return;
  }

  // Explication des versets : réseau d'abord, copie gardée pour le hors-ligne
  // (effacée à la déconnexion avec le reste du Coran).
  if (url.pathname === "/api/coran/explication") {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          if (reponse.ok) {
            const copie = reponse.clone();
            event.waitUntil(caches.open(CORAN).then((cache) => cache.put(requete, copie)));
          }
          return reponse;
        })
        .catch(async () => (await caches.match(requete, { cacheName: CORAN })) || Response.error()),
    );
    return;
  }

  // Fichiers de l'appli : nom unique par version, on les garde.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icones/") ||
    url.pathname.startsWith("/polices/")
  ) {
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
          caches.delete(CORAN);
        } else if (reponse.ok && pageGardee(finale)) {
          // « / » redirige vers l'accueil du rôle : on garde la page d'arrivée.
          event.waitUntil(garderPage(new Request(finale.href), reponse.clone(), finale));
        }
        return reponse;
      })
      .catch(() => (ouverture ? pageSansReseau(new Request(url.href), url) : Response.error())),
  );
});
