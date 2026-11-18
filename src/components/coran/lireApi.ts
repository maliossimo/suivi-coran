/**
 * Lectures du Coran (mots à revoir, sourate suivante, recherche) en simple GET : contrairement aux
 * actions serveur, traitées une par une avec les changements de page, elles ne retardent jamais un
 * onglet touché pendant qu'elles chargent. En cas d'échec, la valeur de repli.
 */
export async function lireApi<T>(
  chemin: string,
  params: Record<string, string>,
  repli: T,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const r = await fetch(`${chemin}?${new URLSearchParams(params)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    if (!r.ok) return repli;
    return ((await r.json()) as T | null) ?? repli;
  } catch {
    return repli;
  }
}
