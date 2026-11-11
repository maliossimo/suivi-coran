/** Identifiant d'une séance côté navigateur (élève, jour, type). */
export function cleSeance(eleveId: string, date: string, type: string): string {
  return `${eleveId}|${date}|${type}`;
}
