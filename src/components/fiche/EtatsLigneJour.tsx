"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { actionEnregistrerSeanceFond, actionValiderSeance } from "@/app/actions/fiche";
import type { Seance } from "@/domain/fiche";
import { effacerBrouillon, envoiInterrompu, lireBrouillon, memeSaisie, type Brouillon } from "./brouillon";
import { lireCleSeance } from "./cleSeance";
import { lancerEnvoi, lireEnAttente, preparerEnvoi, useEnAttente } from "./enregistrementsEnAttente";
import { useSuppressionEnAttente } from "./suppressions";

/** Renvoie une séance dont l'envoi a été coupé (même chemin qu'un enregistrement normal). */
function renvoyer(cle: string, b: Brouillon) {
  const { eleveId, date, type } = lireCleSeance(cle);
  const form = new FormData();
  form.set("eleveId", eleveId);
  form.set("date", date);
  form.set("type", type);
  form.set("dureeMin", String(b.dureeMin));
  form.set("noteLibre", b.noteLibre);
  form.set("tajwid", "");
  form.set("passages", JSON.stringify(b.passages));
  preparerEnvoi(cle, b, () => actionEnregistrerSeanceFond(form));
  lancerEnvoi(cle);
}

/**
 * « Enregistrement… » puis rien (ou « Non enregistrée ») sur la ligne du jour.
 * Un envoi coupé lors d'une visite précédente (onglet fermé, réseau) est repris :
 * - aucune séance en base ce jour-là : renvoyé tout seul ;
 * - la séance en base est identique : l'envoi avait réussi, le brouillon est effacé ;
 * - sinon (séance corrigée ou ressaisie entre-temps) : l'élève choisit en rouvrant la séance.
 */
export function EtatEnregistrement({ cle, enBase }: { cle: string; enBase: Seance | null }) {
  const e = useEnAttente(cle);
  // La fiche est affichée : l'enregistrement peut partir.
  useEffect(() => {
    const t = window.setTimeout(() => lancerEnvoi(cle), 0);
    return () => window.clearTimeout(t);
  }, [cle]);
  // Envoi commencé lors d'une visite précédente mais jamais confirmé (onglet fermé, coupure).
  const [interrompu, setInterrompu] = useState(false);
  useEffect(() => {
    if (e || lireEnAttente(cle) || !envoiInterrompu(cle)) {
      setInterrompu(false);
      return;
    }
    const b = lireBrouillon(cle);
    if (!b) return setInterrompu(false);
    const base = enBase && {
      dureeMin: enBase.dureeMin,
      passages: enBase.passages,
      noteLibre: enBase.noteLibre ?? "",
    };
    if (base && memeSaisie(b, base)) {
      effacerBrouillon(cle);
      setInterrompu(false);
    } else if (!base) {
      renvoyer(cle, b);
    } else {
      setInterrompu(true);
    }
  }, [cle, e, enBase]);
  const suppression = useSuppressionEnAttente(cle);
  if (suppression) return <span className="pastille-envoi">Suppression…</span>;
  if (!e) {
    return interrompu ? (
      <span className="pastille-echec">Pas encore enregistrée · touche pour la retrouver</span>
    ) : null;
  }
  return e.etat === "envoi" ? (
    <span className="pastille-envoi">Enregistrement…</span>
  ) : (
    <span className="pastille-echec">Non enregistrée · touche pour reprendre</span>
  );
}

/** Le Cheikh valide la séance telle quelle, sans l'ouvrir. */
export function BoutonValider({ seanceId, eleveId }: { seanceId: string; eleveId: string }) {
  const [valide, setValide] = useState(false);
  const [, demarrer] = useTransition();

  if (valide) {
    return (
      <span className="bouton-valider bouton-valider-ok" role="status" aria-label="Séance validée">
        <Check size={18} strokeWidth={2.6} aria-hidden="true" />
      </span>
    );
  }
  return (
    <button
      type="button"
      className="bouton-valider"
      aria-label="Valider la séance : tout est bon"
      title="Tout est bon : valider"
      onClick={() => {
        setValide(true); // affichage immédiat, la base suit
        demarrer(async () => {
          const form = new FormData();
          form.set("seanceId", seanceId);
          form.set("eleveId", eleveId);
          const r = await actionValiderSeance(form).catch(() => ({ ok: false as const }));
          if (!r.ok) setValide(false);
        });
      }}
    >
      <Check size={16} strokeWidth={2.6} aria-hidden="true" />
      Vu
    </button>
  );
}
