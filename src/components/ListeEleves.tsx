"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { EtatVide } from "./EtatVide";
import { useState } from "react";
import { actionArchiverEleve } from "@/app/actions/classe";
import { correspondARecherche, libelleDerniereSaisie, type ResumeEleve } from "@/domain/classe";
import { formaterDuree } from "@/domain/fiche";

function initiales(r: ResumeEleve): string {
  return `${r.eleve.prenom[0] ?? ""}${r.eleve.nom[0] ?? ""}`.toUpperCase() || "?";
}

/**
 * Liste de la classe (déjà triée par prénom) avec recherche instantanée,
 * puis les élèves archivés, réactivables d'un clic.
 */
export function ListeEleves({
  actifs,
  archives,
  cleMois,
}: {
  actifs: ResumeEleve[];
  archives: ResumeEleve[];
  cleMois: string;
}) {
  const [recherche, setRecherche] = useState("");
  const visibles = actifs.filter((r) => correspondARecherche(r.eleve, recherche));
  const archivesVisibles = archives.filter((r) => correspondARecherche(r.eleve, recherche));

  return (
    <>
      {actifs.length + archives.length > 1 ? (
        <div className="recherche">
          <span className="recherche-icone" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            type="search"
            className="recherche-champ"
            placeholder="Rechercher un élève…"
            aria-label="Rechercher un élève par prénom ou nom"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {actifs.length > 0 && visibles.length === 0 ? (
        <EtatVide titre="Aucun élève trouvé">
          <p>Personne ne correspond à « {recherche.trim()} ». Vérifie l’orthographe ou cherche par le nom.</p>
        </EtatVide>
      ) : null}

      <ul className="liste-eleves">
        {visibles.map((r) => (
          <li key={r.eleve.id}>
            <Link href={`/maitre/eleves/${r.eleve.id}?mois=${cleMois}`} className="carte-eleve">
              <span className="avatar avatar-clair" aria-hidden="true">
                {initiales(r)}
              </span>
              <span className="carte-eleve-nom">
                {r.eleve.prenom} {r.eleve.nom}
                <small className={r.alerte ? "texte-alerte" : undefined}>
                  Dernière saisie : {libelleDerniereSaisie(r.joursSansSaisie)}
                </small>
              </span>
              <span className="carte-eleve-stats">
                <span>
                  <b>{formaterDuree(r.minutesApprentissage)}</b> apprentissage
                </span>
                <span>
                  <b>{formaterDuree(r.minutesRevision)}</b> révision
                </span>
                <span>
                  <b>{r.joursTravailles}</b> j travaillés
                </span>
                <span>
                  <b>
                    {r.objectifsAtteints}/{r.objectifsTotal}
                  </b>{" "}
                  objectifs
                </span>
              </span>
              <span className="chevron" aria-hidden="true">
                <ChevronRight size={20} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {archivesVisibles.length > 0 ? (
        <details className="archives" open={recherche.trim() !== "" || undefined}>
          <summary>Élèves archivés ({archivesVisibles.length})</summary>
          <ul className="archives-liste">
            {archivesVisibles.map((r) => (
              <li key={r.eleve.id}>
                <Link href={`/maitre/eleves/${r.eleve.id}`}>
                  {r.eleve.prenom} {r.eleve.nom}
                </Link>
                <form action={actionArchiverEleve}>
                  <input type="hidden" name="eleveId" value={r.eleve.id} />
                  <input type="hidden" name="actif" value="true" />
                  <button type="submit" className="bouton-lien-texte">
                    Réactiver
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
