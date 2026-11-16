/**
 * Dernier endroit lu dans le Coran (élève) : gardé sur le téléphone pour la carte
 * « Continuer la lecture » de l'onglet Coran.
 */
const CLE = "coran-derniere-lecture";

export interface DerniereLecture {
  /** Adresse complète de la page lue (chemin + paramètres). */
  adresse: string;
  /** « 18. Al-Kahf » ou « Page 293 ». */
  titre: string;
  /** Horodatage (ms). */
  quand: number;
}

export function retenirLecture(adresse: string, titre: string): void {
  try {
    localStorage.setItem(CLE, JSON.stringify({ adresse, titre, quand: Date.now() }));
  } catch {
    // stockage indisponible : la carte ne s'affichera simplement pas
  }
}

export function lireDerniereLecture(): DerniereLecture | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? "null") as Partial<DerniereLecture> | null;
    if (!v || typeof v.adresse !== "string" || typeof v.titre !== "string" || typeof v.quand !== "number")
      return null;
    // Seulement une page de lecture de l'élève (jamais une adresse étrangère).
    if (!v.adresse.startsWith("/eleve/coran/lire")) return null;
    return { adresse: v.adresse, titre: v.titre, quand: v.quand };
  } catch {
    return null;
  }
}
