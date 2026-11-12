import { ShieldCheck, User } from "lucide-react";
import { initialesDe, teinteDe } from "@/domain/avatar";
import type { Role } from "@/domain/roles";

/**
 * Avatar commun à tout le site : carré arrondi (comme la tuile ق du logo),
 * initiales sur une teinte propre à chaque personne. Le Cheikh porte un liseré or,
 * l'admin un liseré vert ; sans nom, une icône remplace le « ? ».
 */
export function Avatar({
  prenom,
  nom,
  email,
  cle,
  role,
  taille = "moyen",
  surBarre = false,
}: {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  /** Identifiant stable (id) pour garder la même couleur. */
  cle: string;
  role?: Role;
  taille?: "petit" | "moyen" | "grand";
  /** Sur la barre verte du haut : version or. */
  surBarre?: boolean;
}) {
  const initiales = initialesDe(prenom, nom, email);
  const classes = [
    "avatar",
    `avatar-${taille}`,
    surBarre ? "avatar-barre" : `avatar-teinte-${teinteDe(cle)}`,
    role === "maitre" ? "avatar-cheikh" : role === "admin" ? "avatar-admin" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const tailleIcone = taille === "grand" ? 24 : taille === "petit" ? 15 : 18;
  return (
    <span className={classes} aria-hidden="true">
      {initiales ||
        (role === "admin" ? (
          <ShieldCheck size={tailleIcone} strokeWidth={2.2} />
        ) : (
          <User size={tailleIcone} strokeWidth={2.2} />
        ))}
    </span>
  );
}
