/** Recherche dans le Coran : référence (« 2:255 »), sourate (« Maryam », « مريم », « 19 ») ou mots arabes. */
import { squeletteMot } from "./essais";

export interface SourateRecherche {
  numero: number;
  nomLatin: string;
  nomAr: string;
  nbVersets: number;
}

export type ResultatRecherche =
  | { type: "sourate"; sourate: number; nomLatin: string; nomAr: string }
  | { type: "verset"; sourate: number; verset: number; nomLatin: string; texte: string };

/** Nom latin simplifié : « Al-Baqara » → « baqara », « Āl ʿImrān » → « imran ». */
export function nomSimplifie(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(al|an|ar|as|at|ad|adh|az|ash|aal|ali)[-\s]/, "")
    .replace(/[^a-z]/g, "");
}

const estArabe = (t: string) => /[ء-يٱ]/.test(t);
const squeletteTexte = (t: string) => t.split(/\s+/).map(squeletteMot).filter(Boolean).join(" ");

/**
 * Cherche `requete`. `versets(s)` : texte des versets de la sourate s (sans rosace). Au plus `limite` versets ;
 * `total` dit combien il y en avait.
 */
export function rechercherCoran(
  requete: string,
  sourates: readonly SourateRecherche[],
  versets: (sourate: number) => readonly string[],
  limite = 40,
): { resultats: ResultatRecherche[]; total: number } {
  const q = requete.trim();
  if (!q) return { resultats: [], total: 0 };
  const parNumero = new Map(sourates.map((s) => [s.numero, s]));
  const vers = (s: SourateRecherche, v: number): ResultatRecherche => ({
    type: "verset",
    sourate: s.numero,
    verset: v,
    nomLatin: s.nomLatin,
    texte: versets(s.numero)[v - 1] ?? "",
  });
  const sour = (s: SourateRecherche): ResultatRecherche => ({
    type: "sourate",
    sourate: s.numero,
    nomLatin: s.nomLatin,
    nomAr: s.nomAr,
  });

  // Référence : « 2:255 », « 2 255 », « 2.255 », ou un numéro de sourate.
  const ref = /^(\d{1,3})\s*[:.\s]\s*(\d{1,3})$/.exec(q);
  if (ref) {
    const s = parNumero.get(Number(ref[1]));
    const v = Number(ref[2]);
    return s && v >= 1 && v <= s.nbVersets
      ? { resultats: [vers(s, v)], total: 1 }
      : { resultats: [], total: 0 };
  }
  if (/^\d{1,3}$/.test(q)) {
    const s = parNumero.get(Number(q));
    return s ? { resultats: [sour(s)], total: 1 } : { resultats: [], total: 0 };
  }

  if (!estArabe(q)) {
    const cherche = nomSimplifie(q);
    if (cherche.length < 2) return { resultats: [], total: 0 };
    const trouvees = sourates.filter((s) => nomSimplifie(s.nomLatin).includes(cherche)).map(sour);
    return { resultats: trouvees, total: trouvees.length };
  }

  // Arabe : les sourates dont le nom correspond, puis les versets qui contiennent ces lettres (sans voyelles).
  const cherche = squeletteTexte(q);
  if (cherche.replace(/ /g, "").length < 2) return { resultats: [], total: 0 };
  const resultats: ResultatRecherche[] = sourates
    .filter((s) => squeletteTexte(s.nomAr).includes(cherche))
    .map(sour);
  let total = resultats.length;
  for (const s of sourates)
    versets(s.numero).forEach((texte, i) => {
      if (!squeletteTexte(texte).includes(cherche)) return;
      total++;
      if (resultats.length < limite) resultats.push(vers(s, i + 1));
    });
  return { resultats, total };
}
