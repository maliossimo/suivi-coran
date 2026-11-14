/**
 * Mise à jour automatique de l'appli ouverte : règles pures (testées).
 * Une nouvelle version est en ligne quand le serveur annonce un autre déploiement
 * que celui chargé dans le téléphone.
 */
export function nouvelleVersion(locale: string | null, serveur: string | null): boolean {
  return Boolean(locale && serveur && locale !== serveur);
}

export interface EtatEcran {
  /** L'appli est à l'écran (pas en arrière-plan). */
  visible: boolean;
  /** Une feuille (réglages, verset…) est ouverte. */
  feuilleOuverte: boolean;
  /** Un son joue (récitation, enregistrement). */
  sonEnCours: boolean;
  /** Le curseur est dans un champ de saisie. */
  saisieEnCours: boolean;
  /** Temps depuis le dernier toucher ou la dernière touche (ms). */
  inactifDepuis: number;
}

/** Délai sans aucun geste avant de recharger une appli ouverte. */
export const INACTIVITE_AVANT_RECHARGEMENT = 20_000;

/**
 * Peut-on recharger maintenant sans gêner ? Jamais pendant une saisie, une écoute,
 * une feuille ouverte, ni pendant que la personne se sert de l'appli.
 */
export function rechargementSansGene(e: EtatEcran): boolean {
  return (
    e.visible &&
    !e.feuilleOuverte &&
    !e.sonEnCours &&
    !e.saisieEnCours &&
    e.inactifDepuis >= INACTIVITE_AVANT_RECHARGEMENT
  );
}

/**
 * Plantage dû à un décalage de versions : l'appli ouverte (ancienne) charge un morceau de code de la
 * nouvelle version mise en ligne entre-temps (ou l'inverse). Un rechargement suffit à le corriger.
 */
export function erreurDeVersion(nom: string, message: string): boolean {
  return (
    nom === "ChunkLoadError" ||
    /^\w{1,3}\[\w{1,3}\] is not a function$/.test(message) ||
    /Loading (CSS )?chunk [\w-]+ failed/i.test(message) ||
    /reading 'call'/.test(message) ||
    /dynamically imported module/i.test(message) ||
    /Failed to find Server Action/i.test(message)
  );
}
