/** Identifiant d'une séance côté navigateur (élève, jour, type). */
export function cleSeance(eleveId: string, date: string, type: string): string {
  return `${eleveId}|${date}|${type}`;
}

/** Inverse de `cleSeance`. */
export function lireCleSeance(cle: string): { eleveId: string; date: string; type: string } {
  const [eleveId = "", date = "", type = ""] = cle.split("|");
  return { eleveId, date, type };
}
