/** Une version du CHANGELOG, lue pour la page « Nouveautés ». */
export interface VersionPubliee {
  numero: string;
  date: string;
  rubriques: { titre: string; points: string[] }[];
}

/** Lit les sections « ## [x.y.z] — date » du CHANGELOG (les plus récentes d'abord). */
export function lireChangelog(texte: string, nombre = 8): VersionPubliee[] {
  const versions: VersionPubliee[] = [];
  let courante: VersionPubliee | null = null;
  for (const ligne of texte.split("\n")) {
    const v = /^## \[([\d.]+)\]\s*[—-]\s*(.+)$/.exec(ligne);
    if (v) {
      if (versions.length >= nombre) break;
      courante = { numero: v[1] ?? "", date: (v[2] ?? "").trim(), rubriques: [] };
      versions.push(courante);
      continue;
    }
    if (!courante) continue;
    const r = /^### (.+)$/.exec(ligne);
    if (r) {
      courante.rubriques.push({ titre: (r[1] ?? "").trim(), points: [] });
      continue;
    }
    const p = /^- (.+)$/.exec(ligne);
    if (p) {
      if (courante.rubriques.length === 0) courante.rubriques.push({ titre: "Changements", points: [] });
      courante.rubriques.at(-1)?.points.push((p[1] ?? "").replace(/\*\*|`/g, "").trim());
    }
  }
  return versions;
}
