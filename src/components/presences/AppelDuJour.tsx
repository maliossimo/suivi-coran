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
 * Carte « Appel du jour » en haut de « Ma classe » : une seule carte, une ligne par classe
 * (« Faire l'appel » tant qu'il n'est pas fait, le résumé ensuite).
 */
export function AppelDuJour({ classes }: { classes: ClasseDuJour[] }) {
  if (!classes.length) return null;
  const aFaire = classes.filter((c) => !c.resume).length;
  return (
    <section
      className={aFaire ? "carte-unie appel-du-jour" : "carte-unie appel-du-jour fait"}
      aria-labelledby="appel-du-jour-titre"
    >
      <h2 className="carte-unie-titre" id="appel-du-jour-titre">
        <CalendarCheck size={18} aria-hidden="true" /> Appel du jour
      </h2>
      <ul>
        {classes.map((c) => (
          <li key={c.id}>
            <Link
              href={`/presences/${c.id}/appel`}
              className={c.resume ? "appel-ligne" : "appel-ligne a-faire"}
            >
              <span className="appel-ligne-classe">
                <b>{c.nom}</b>
                <small>
                  {c.resume
                    ? libelleResume(c.resume)
                    : `${c.nbMembres} élève${c.nbMembres > 1 ? "s" : ""} · tous présents au départ`}
                </small>
              </span>
              <span className="appel-ligne-action">
                {c.resume ? (
                  <>
                    <Check size={15} aria-hidden="true" /> Fait
                  </>
                ) : (
                  "Faire l’appel"
                )}
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
