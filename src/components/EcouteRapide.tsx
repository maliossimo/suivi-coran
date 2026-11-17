"use client";

import { Check, ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { actionMarquerAcquis } from "@/app/actions/acquis";
import { actionMarquerPassages, actionSeancesAEcouter } from "@/app/actions/fiche";
import { formaterDuree, libelleJourCourt, libelleJourSemaine, LIBELLE_TYPE } from "@/domain/fiche";
import type { AEcouter, SeanceAEcouter } from "@/services/fiche";
import { Feuille } from "./Feuille";
import { retoursActives } from "./retourSensoriel";

/**
 * Écoute rapide : depuis la liste de sa classe, le Cheikh voit les séances à écouter d'un élève
 * dans une feuille du bas, et les marque « À refaire » ou « Validé » sans ouvrir la fiche.
 * La ligne part tout de suite ; si l'enregistrement échoue, elle revient avec un message.
 */
export function EcouteRapide({
  eleve,
  onFermer,
}: {
  eleve: { id: string; prenom: string; nom: string } | null;
  onFermer: () => void;
}) {
  const [donnees, setDonnees] = useState<AEcouter | null>(null);
  const seances = donnees?.seances ?? null;
  const [erreur, setErreur] = useState<string | null>(null);
  const [faites, setFaites] = useState<Record<string, "ecoute" | "valide">>({});

  useEffect(() => {
    if (!eleve) return;
    let annule = false;
    setDonnees(null);
    setErreur(null);
    setFaites({});
    actionSeancesAEcouter(eleve.id)
      .then((r) => {
        if (annule) return;
        if (r) setDonnees(r);
        else setErreur("Les séances n’ont pas pu être chargées. Réessaie.");
      })
      .catch(() => !annule && setErreur("Pas de réseau : réessaie dans un instant."));
    return () => {
      annule = true;
    };
  }, [eleve]);

  const marquer = (s: SeanceAEcouter, etat: "ecoute" | "valide") => {
    if (!eleve) return;
    if (retoursActives()) navigator.vibrate?.(8);
    setErreur(null);
    setFaites((f) => ({ ...f, [s.id]: etat }));
    actionMarquerPassages(eleve.id, { seanceId: s.id, etat })
      .then((r) => {
        if (r.ok) return;
        setFaites((f) => sans(f, s.id));
        setErreur(r.erreur ?? "Le changement n’a pas pu être enregistré.");
      })
      .catch(() => {
        setFaites((f) => sans(f, s.id));
        setErreur("Pas de réseau : le changement n’a pas été enregistré.");
      });
  };

  /** Partie « déjà connue » : marquée tout de suite, revient avec un message si l'enregistrement échoue. */
  const marquerAcquis = (id: string, etat: "ecoute" | "valide") => {
    if (!eleve) return;
    if (retoursActives()) navigator.vibrate?.(8);
    setErreur(null);
    setFaites((f) => ({ ...f, [id]: etat }));
    actionMarquerAcquis(eleve.id, id, etat)
      .then((r) => {
        if (r.ok) return;
        setFaites((f) => sans(f, id));
        setErreur(r.erreur);
      })
      .catch(() => {
        setFaites((f) => sans(f, id));
        setErreur("Pas de réseau : le changement n’a pas été enregistré.");
      });
  };

  const restantes = [
    ...(seances?.filter((s) => !faites[s.id]) ?? []),
    ...(donnees?.acquis.filter((a) => !faites[a.id]) ?? []),
  ];
  return (
    <Feuille
      ouverte={eleve !== null}
      onFermer={onFermer}
      titre={eleve ? `À écouter · ${eleve.prenom} ${eleve.nom}`.trim() : "À écouter"}
    >
      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {seances === null && !erreur ? (
        <div className="ecoute-rapide-chargement" aria-label="Chargement">
          <span className="squelette" />
          <span className="squelette" />
        </div>
      ) : null}
      {seances && restantes.length === 0 ? (
        <p className="ecoute-rapide-fini">
          <Check size={20} aria-hidden="true" /> Tout est écouté pour cet élève.
        </p>
      ) : null}
      {seances ? (
        <ul className="ecoute-rapide">
          {seances.map((s) =>
            faites[s.id] ? null : (
              <li key={s.id} className={`ecoute-rapide-seance seance-${s.type}`}>
                <div className="ecoute-rapide-tete">
                  <b>
                    {libelleJourSemaine(s.date)} {libelleJourCourt(s.date)}
                  </b>
                  <span className="ecoute-rapide-type">{LIBELLE_TYPE[s.type]}</span>
                  {s.dureeMin ? (
                    <span className="ecoute-rapide-duree">{formaterDuree(s.dureeMin)}</span>
                  ) : null}
                </div>
                <p className="ecoute-rapide-passages">
                  {s.passages.length ? s.passages.join(" · ") : "Séance sans passage"}
                </p>
                {s.noteLibre ? <p className="ecoute-rapide-note">« {s.noteLibre} »</p> : null}
                <div className="ecoute-rapide-actions">
                  <button type="button" className="bouton-secondaire" onClick={() => marquer(s, "ecoute")}>
                    <RotateCcw size={17} aria-hidden="true" /> À refaire
                  </button>
                  <button type="button" className="bouton" onClick={() => marquer(s, "valide")}>
                    <Check size={17} aria-hidden="true" /> Validé
                  </button>
                  <Link
                    className="ecoute-rapide-ouvrir"
                    href={eleve ? `/maitre/eleves/${eleve.id}/seance?date=${s.date}&type=${s.type}` : "#"}
                    aria-label="Ouvrir la séance"
                    onClick={onFermer}
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : null}
      {donnees?.acquis.length ? (
        <ul className="ecoute-rapide">
          {donnees.acquis.map((a) =>
            faites[a.id] ? null : (
              <li key={a.id} className="ecoute-rapide-seance seance-acquis">
                <div className="ecoute-rapide-tete">
                  <b>Déjà connu</b>
                  <span className="ecoute-rapide-type">Déclaré par l’élève</span>
                </div>
                <p className="ecoute-rapide-passages">{a.libelle}</p>
                <div className="ecoute-rapide-actions">
                  <button
                    type="button"
                    className="bouton-secondaire"
                    onClick={() => marquerAcquis(a.id, "ecoute")}
                  >
                    <RotateCcw size={17} aria-hidden="true" /> À refaire
                  </button>
                  <button type="button" className="bouton" onClick={() => marquerAcquis(a.id, "valide")}>
                    <Check size={17} aria-hidden="true" /> Validé
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </Feuille>
  );
}

/** Copie sans la clé donnée (la séance revient dans la liste). */
function sans<T>(objet: Record<string, T>, cle: string): Record<string, T> {
  const copie = { ...objet };
  delete copie[cle];
  return copie;
}
