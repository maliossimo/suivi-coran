import { ShieldCheck, User } from "lucide-react";
import { initialesDe, teinteDe } from "@/domain/avatar";
import type { Role } from "@/domain/roles";

/** Étoile à 8 branches (les deux carrés du logo), en un seul contour. */
const ETOILE =
  "M100 -7.5L131.5 24H176V68.5L207.5 100L176 131.5V176H131.5L100 207.5L68.5 176H24V131.5L-7.5 100L24 68.5V24H68.5Z";

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
  // Barre du haut : étoile dorée comme le logo, en verre sur le ciel, initiales en or.
  if (surBarre)
    return (
      <span className="avatar-etoile" aria-hidden="true">
        <svg viewBox="-12 -12 224 224" className="avatar-etoile-forme">
          <path d={ETOILE} />
        </svg>
        <span className="avatar-etoile-initiales">
          {initiales ||
            (role === "admin" ? (
              <ShieldCheck size={16} strokeWidth={2.2} />
            ) : (
              <User size={16} strokeWidth={2.2} />
            ))}
        </span>
      </span>
    );
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
