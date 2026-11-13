import { CalendarCheck, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { libelleResume, type StatutPresence } from "@/domain/presences";

export interface ClasseDuJour {
  id: string;
  nom: string;
  nbMembres: number;
  resume: Record<StatutPresence, number> | null;
}

/**
 * Carte « Appel du jour » en haut de « Ma classe » : bien visible tant que l'appel
 * n'est pas fait, discrète ensuite.
 */
export function AppelDuJour({ classes }: { classes: ClasseDuJour[] }) {
  if (!classes.length) return null;
  const aFaire = classes.filter((c) => !c.resume);
  return (
    <section className={aFaire.length ? "appel-du-jour" : "appel-du-jour fait"} aria-label="Appel du jour">
      {classes.map((c) =>
        c.resume ? (
          <Link key={c.id} href={`/presences/${c.id}/appel`} className="appel-du-jour-ligne">
            <Check size={16} aria-hidden="true" />
            <span className="appel-du-jour-texte">
              Appel fait · <b>{c.nom}</b> · {libelleResume(c.resume)}
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <Link key={c.id} href={`/presences/${c.id}/appel`} className="appel-du-jour-ligne a-faire">
            <CalendarCheck size={20} aria-hidden="true" />
            <span className="appel-du-jour-texte">
              <b>Appel du jour · {c.nom}</b>
              <small>
                {c.nbMembres} élève{c.nbMembres > 1 ? "s" : ""} · tout le monde est présent au départ
              </small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ),
      )}
    </section>
  );
}
