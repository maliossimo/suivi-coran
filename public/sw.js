/*
 * Service worker de « Suivi Coran ».
 * Rôle unique : si le téléphone n'a pas de réseau, afficher une page « Pas de connexion »
 * au lieu de la page d'erreur du navigateur. Aucune donnée n'est mise en cache
 * (les pages restent toujours à jour et privées).
 */
const CACHE = "suivi-coran-hors-ligne-v1";
const PAGE_HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(PAGE_HORS_LIGNE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Seules les ouvertures de page sont concernées ; tout le reste passe normalement.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(PAGE_HORS_LIGNE).then((r) => r || Response.error())),
  );
});
