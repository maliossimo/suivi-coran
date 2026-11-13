import { Headphones } from "lucide-react";
import Link from "next/link";
import { creerReferentiel, libellePassage, type Passage, type Sourate } from "@/domain/versets";
import type { Lecture } from "@/domain/lectures";

/**
 * Séance de l'élève : chaque passage s'ouvre dans la page Coran, dans sa lecture,
 * prêt à être écouté et répété. Jamais dans la vue du Cheikh.
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
    <section className="ecouter-passages" aria-label="Écouter les passages">
      <h2>
        <Headphones size={18} aria-hidden="true" />
        Écouter dans le Coran
      </h2>
      <ul>
        {passages.map((p, i) => {
          const fin =
            p.sourateFin === p.sourateDebut
              ? p.versetFin
              : (ref.get(p.sourateDebut)?.nbVersets ?? p.versetDebut);
          const lien = `/admin/coran?lecture=${lecture}&sourate=${p.sourateDebut}&du=${p.versetDebut}&au=${fin}`;
          return (
            <li key={i}>
              <Link href={lien}>{libellePassage(ref, p)}</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
