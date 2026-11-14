/** État de la connexion vu par l'élève pendant la vérification. */
export type EtatReseau = "ok" | "lent" | "coupe";

const LENT_APRES_MS = 5000;
const ESSAIS = 4;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function enLigne(delaiMs: number): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    const fin = () => {
      window.removeEventListener("online", fin);
      clearTimeout(minuteur);
      resolve();
    };
    const minuteur = setTimeout(fin, delaiMs);
    window.addEventListener("online", fin);
  });
}

/**
 * Envoi au moteur, résistant au réseau : réponse lente signalée, coupure ou serveur indisponible
 * (5xx) réessayés quelques fois en attendant le retour de la connexion. Une erreur de saisie (4xx) ne l'est pas.
 */
export async function envoyerAvecEssais(
  url: string,
  init: RequestInit,
  signaler: (etat: EtatReseau) => void,
): Promise<Response> {
  for (let essai = 0; ; essai++) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      signaler("coupe");
      await enLigne(20_000);
    }
    const lent = setTimeout(() => signaler("lent"), LENT_APRES_MS);
    try {
      const r = await fetch(url, init);
      clearTimeout(lent);
      if (r.status >= 500 && essai < ESSAIS - 1) throw new Error(`serveur ${r.status}`);
      signaler("ok");
      return r;
    } catch (e) {
      clearTimeout(lent);
      if (essai >= ESSAIS - 1) {
        signaler("ok");
        throw e instanceof Error && e.message.startsWith("serveur")
          ? new Error("Le serveur ne répond pas : réessaie dans un instant.")
          : new Error("Connexion perdue : vérifie le réseau et réessaie.");
      }
      signaler("coupe");
      await pause(1500 * 2 ** essai);
    }
  }
}
