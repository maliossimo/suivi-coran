import { Headphones, Mic } from "lucide-react";
import Link from "next/link";
import { creerReferentiel, libellePassage, type Passage, type Sourate } from "@/domain/versets";
import type { Lecture } from "@/domain/lectures";

/**
 * Séance de l'élève : chaque passage s'ouvre dans la page Coran, dans sa lecture, prêt à être
 * écouté, ou récité (l'appli l'écoute et montre ses fautes). Jamais dans la vue du Cheikh.
 */
export function EcouterPassages({
  passages,
  sourates,
  lecture,
}: {
  passages: readonly Passage[];
  sourates: readonly Sourate[];
  lecture: Lecture;
}) {
  if (!passages.length) return null;
  const ref = creerReferentiel(sourates);
  return (
    <section className="ecouter-passages" aria-label="Écouter et réciter les passages">
      <h2>
        <Headphones size={18} aria-hidden="true" />
        Écouter et réciter
      </h2>
      <ul>
        {passages.map((p, i) => {
          const fin =
            p.sourateFin === p.sourateDebut
              ? p.versetFin
              : (ref.get(p.sourateDebut)?.nbVersets ?? p.versetDebut);
          const lien = `/eleve/coran/lire?lecture=${lecture}&sourate=${p.sourateDebut}&du=${p.versetDebut}&au=${fin}`;
          return (
            <li key={i}>
              <Link href={lien}>{libellePassage(ref, p)}</Link>
              <Link href={`${lien}&reciter=1`} className="ecouter-reciter">
                <Mic size={15} aria-hidden="true" /> Réciter
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
