import { RotateCcw } from "lucide-react";
import Link from "next/link";
import type { MotsARevoirSourate } from "@/services/essais";

/**
 * Progression : les mots ratés lors des récitations, pas encore réussis deux fois, sourate par sourate.
 * L'élève ouvre la sourate d'un toucher (Réciter y propose ces mots) ; le Cheikh voit la liste.
 */
export function MotsARevoir({ liste, lienCoran }: { liste: MotsARevoirSourate[]; lienCoran: string | null }) {
  if (!liste.length) return null;
  const total = liste.reduce((n, s) => n + s.mots.length, 0);
  return (
    <section className="carte-graphique mots-a-revoir">
      <h2>
        <RotateCcw size={18} aria-hidden="true" /> Mots à revoir
      </h2>
      <p className="carte-graphique-sous">
        {total} mot{total > 1 ? "s" : ""} raté{total > 1 ? "s" : ""} en récitation. Chacun sort de la liste
        après deux récitations réussies.
      </p>
      <ul>
        {liste.map((s) => {
          const contenu = (
            <>
              <span className="mots-a-revoir-sourate">
                <b>{s.nomLatin}</b>
                <small>
                  {s.mots.length} mot{s.mots.length > 1 ? "s" : ""}
                </small>
              </span>
              <span lang="ar" dir="rtl" className="mots-a-revoir-mots">
                {s.mots
                  .slice(0, 6)
                  .map((m) => m.mot)
                  .join(" · ")}
                {s.mots.length > 6 ? " …" : ""}
              </span>
            </>
          );
          return (
            <li key={`${s.lecture}:${s.sourate}`}>
              {lienCoran ? (
                <Link href={`${lienCoran}?lecture=${s.lecture}&sourate=${s.sourate}`}>{contenu}</Link>
              ) : (
                <div>{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
