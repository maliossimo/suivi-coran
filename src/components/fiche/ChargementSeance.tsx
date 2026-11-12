"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { positionSurFiche } from "@/domain/calendrier";
import { libelleJourCourt, LIBELLE_TYPE } from "@/domain/fiche";
import { LogoEtoile } from "../logo/LogoEtoile";

/** Titre du jour, lu dans l'adresse : il s'affiche avant toute réponse du serveur. */
function TitreDuJour() {
  const params = useSearchParams();
  const date = params.get("date") ?? "";
  const type = params.get("type") === "revision" ? "revision" : "apprentissage";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return <div className="squelette squelette-titre-seance" />;
  const { semaine, jour } = positionSurFiche(date);
  return (
    <header className="seance-entete">
      <h1>
        {LIBELLE_TYPE[type]} · Jour {jour}
      </h1>
      <p>
        Semaine {semaine} · {libelleJourCourt(date)}
      </p>
    </header>
  );
}

/**
 * Écran d'attente d'une séance : la barre, le titre du jour et la forme du formulaire
 * apparaissent dès le toucher ; seuls les champs attendent la base.
 */
export function ChargementSeance({ titreBarre }: { titreBarre: string }) {
  return (
    <>
      <header className="barre">
        <div className="barre-contenu">
          <Link href="/" className="barre-marque" aria-label="Retour à l’accueil">
            <span className="barre-logo" aria-hidden="true">
              <LogoEtoile />
            </span>
            <div className="barre-titres">
              <span className="barre-app">Suivi cours Coran</span>
              <span className="barre-titre">{titreBarre}</span>
            </div>
          </Link>
        </div>
      </header>
      <main className="espace espace-etroit" aria-busy="true" aria-live="polite">
        <span className="visuellement-cache">Chargement de la séance…</span>
        <span className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Retour à la fiche
        </span>
        <Suspense fallback={<div className="squelette squelette-titre-seance" />}>
          <TitreDuJour />
        </Suspense>
        <div className="squelette-formulaire">
          <div className="squelette squelette-champ-court" />
          <div className="squelette squelette-champ" />
          <div className="squelette squelette-champ" />
          <div className="squelette squelette-bouton" />
        </div>
      </main>
    </>
  );
}
