export type Role = "eleve" | "maitre" | "admin";

/** Nom du rôle dans l'interface (le rôle « maitre » s'affiche toujours « Cheikh »). */
export const LIBELLE_ROLE: Record<Role, string> = { eleve: "Élève", maitre: "Cheikh", admin: "Admin" };

/** Version longue (en-tête, « Mon compte »). */
export const LIBELLE_ROLE_LONG: Record<Role, string> = {
  eleve: "Élève",
  maitre: "Cheikh",
  admin: "Administrateur",
};

/** Page d'accueil de chaque rôle après connexion. */
export function accueilDuRole(role: Role): string {
  switch (role) {
    case "eleve":
      return "/eleve";
    case "maitre":
      return "/maitre";
    case "admin":
      return "/admin";
  }
}

/** Espaces accessibles : l'admin peut ouvrir l'espace maître pour déboguer. */
export function peutOuvrirEspace(role: Role, espace: Role): boolean {
  if (role === espace) return true;
  return role === "admin" && espace === "maitre";
}
