/**
 * Recherche dans le Coran : une référence (« 2:255 »), une sourate (« Maryam », « مريم », « al-kahf ») ou des mots
 * arabes, avec ou sans voyelles. Règles pures : le texte est fourni par l'appelant.
 */
import { squeletteMot } from "./essais";
import { rechercherSourates } from "./recherche";

export interface SourateCherchee {
  numero: number;
  nomLatin: string;
  nomAr: string;
  nbVersets: number;
}

export type ResultatRecherche =
  | { type: "verset"; sourate: number; verset: number; texte: string; mots: number[] }
  | { type: "sourate"; sourate: number };

/** Une référence « 2:255 », « 2 255 » ou « 2.255 » ; null sinon. */
export function lireReference(requete: string): { sourate: number; verset: number | null } | null {
  const m = /^\s*(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3}))?\s*$/.exec(requete);
  if (!m) return null;
  return { sourate: Number(m[1]), verset: m[2] ? Number(m[2]) : null };
}

const estArabe = (t: string) => /[\u0600-\u06ff]/.test(t);
/**
 * Clé de recherche d'un mot : ses lettres, sans aucun alif (le texte uthmani en écrit souvent un petit, au-dessus
 * de la ligne : « ٱلۡعَٰلَمِينَ » doit se trouver en tapant « العالمين »), ة et ه confondus.
 */
const cle = (t: string) => squeletteMot(t).replace(/ا/g, "").replace(/ة/g, "ه");

/**
 * Cherche. `texte(s)` : les versets de la sourate s (texte affiché, rosace comprise). Les sourates trouvées par leur
 * nom viennent d'abord, puis les versets (dans l'ordre du Coran), `limite` au plus.
 */
export function rechercher(
  requete: string,
  sourates: readonly SourateCherchee[],
  texte: (sourate: number) => readonly string[],
  limite = 40,
): ResultatRecherche[] {
  const q = requete.trim();
  if (!q) return [];

  const ref = lireReference(q);
  if (ref) {
    const s = sourates.find((x) => x.numero === ref.sourate);
    if (!s) return [];
    if (ref.verset === null) return [{ type: "sourate", sourate: s.numero }];
    if (ref.verset < 1 || ref.verset > s.nbVersets) return [{ type: "sourate", sourate: s.numero }];
    return [
      {
        type: "verset",
        sourate: s.numero,
        verset: ref.verset,
        texte: texte(s.numero)[ref.verset - 1] ?? "",
        mots: [],
      },
    ];
  }

  const resultats: ResultatRecherche[] = [];
  if (!estArabe(q)) {
    if (q.length < 2) return [];
    // Noms latins : la recherche des sourates du sélecteur (« baq », « al kahf », « an-naba »…).
    return rechercherSourates(sourates, q)
      .slice(0, limite)
      .map((s) => ({ type: "sourate", sourate: s.numero }));
  }

  // Arabe : un nom de sourate…
  const sq = cle(q.replace(/\s+/g, ""));
  for (const s of sourates)
    if (cle(s.nomAr.replace(/^سورة\s*/, "").replace(/\s+/g, "")) === sq)
      resultats.push({ type: "sourate", sourate: s.numero });

  // … puis des mots qui se suivent, comparés par leurs lettres (voyelles et formes de l'alif ignorées).
  const cherches = q.split(/\s+/).map(cle).filter(Boolean);
  if (!cherches.length || cherches.join("").length < 2) return resultats;
  const premier = squeletteMot(q);
  const sansArticle =
    cherches.length === 1 && premier.startsWith("ال") && premier.length > 4 ? cle(premier.slice(2)) : null;
  for (const s of sourates) {
    const versets = texte(s.numero);
    for (let v = 0; v < versets.length; v++) {
      const mots = versets[v]!.split(/\s+/).map(cle);
      const indices: number[] = [];
      // Les mots (au sens du texte, signes seuls exclus) numérotés comme decouperMots : 1, 2, 3…
      const reels = mots.map((m, i) => ({ m, i })).filter((x) => x.m.length > 0);
      for (let k = 0; k + cherches.length <= reels.length; k++) {
        const ok = cherches.every((c, j) => {
          const mot = reels[k + j]!.m;
          // Le premier mot cherché peut porter un préfixe (و، ف، ب، ل، ال…), le dernier une fin (ـهم…).
          // Un seul mot : aussi sans son article (« الكرسي » trouve « كُرۡسِيُّهُ »).
          if (cherches.length === 1)
            return mot.includes(c) || (sansArticle !== null && mot.includes(sansArticle));
          if (j === 0) return mot.endsWith(c);
          if (j === cherches.length - 1) return mot.startsWith(c);
          return mot === c;
        });
        if (ok) for (let j = 0; j < cherches.length; j++) indices.push(k + j + 1);
      }
      if (indices.length) {
        resultats.push({
          type: "verset",
          sourate: s.numero,
          verset: v + 1,
          texte: versets[v]!,
          mots: indices,
        });
        if (resultats.length >= limite) return resultats;
      }
    }
  }
  return resultats;
}
