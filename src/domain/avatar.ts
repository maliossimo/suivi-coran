/**
 * Avatars : initiales et teinte stable par personne. Code pur, testé.
 */

/** Première lettre « affichable » d'un mot (ignore tirets, apostrophes, espaces). */
function premiereLettre(mot: string): string {
  const m = mot.trim().match(/\p{L}/u);
  return m ? m[0].toLocaleUpperCase("fr") : "";
}

/**
 * Deux initiales au plus : prénom + nom, sinon les deux premiers mots du prénom,
 * sinon la première lettre de l'e-mail ; chaîne vide si rien n'est exploitable.
 */
export function initialesDe(
  prenom: string | null | undefined,
  nom: string | null | undefined,
  email?: string | null,
): string {
  const p = (prenom ?? "").trim();
  const n = (nom ?? "").trim();
  if (p && n) return premiereLettre(p) + premiereLettre(n);
  const seul = p || n;
  if (seul) {
    const mots = seul.split(/[\s-]+/).filter(Boolean);
    return (premiereLettre(mots[0] ?? "") + (mots.length > 1 ? premiereLettre(mots[1]!) : "")).slice(0, 2);
  }
  return email ? premiereLettre(email.split("@")[0] ?? "") : "";
}

export const NB_TEINTES = 6;

/** Teinte (0 à NB_TEINTES-1) toujours la même pour une même personne. */
export function teinteDe(cle: string): number {
  let h = 0;
  for (const c of cle) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return h % NB_TEINTES;
}
