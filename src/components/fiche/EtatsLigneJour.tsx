"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { actionEnregistrerSeanceFond, actionValiderSeance } from "@/app/actions/fiche";
import { retourSensoriel } from "@/components/retourSensoriel";
import { memeContenuSeance, type ContenuSeance, type Seance } from "@/domain/fiche";
import { effacerBrouillon, envoiInterrompu, type Brouillon } from "./brouillon";
import { lireCleSeance } from "./cleSeance";
import { lancerEnvoi, lireEnAttente, preparerEnvoi, useEnAttente } from "./enregistrementsEnAttente";
import { useSuppressionEnAttente } from "./suppressions";

/**
 * Renvoie une séance dont l'envoi a été coupé (même chemin qu'un enregistrement normal).
 * `attendu` : la séance en base au moment de la saisie ; la base refuse si elle a changé depuis.
 */
function renvoyer(cle: string, b: Brouillon, attendu: ContenuSeance | null) {
  const { eleveId, date, type } = lireCleSeance(cle);
  const form = new FormData();
  form.set("eleveId", eleveId);
  form.set("date", date);
  form.set("type", type);
  form.set("dureeMin", String(b.dureeMin));
  form.set("noteLibre", b.noteLibre);
  form.set("tajwid", "");
  form.set("passages", JSON.stringify(b.passages));
  form.set("attendu", JSON.stringify(attendu));
  preparerEnvoi(cle, b, () => actionEnregistrerSeanceFond(form));
  lancerEnvoi(cle);
}

/**
 * État de la séance du jour : « Enregistrement… », « Sans réseau », ou un échec à reprendre.
 * Un envoi coupé lors d'une visite précédente (onglet fermé, réseau) est repris tout seul ;
 * la base refuse s'il écraserait une séance modifiée entre-temps (Cheikh, autre téléphone).
 */
export function EtatEnregistrement({ cle, enBase }: { cle: string; enBase: Seance | null }) {
  const e = useEnAttente(cle);
  // La fiche est affichée : l'enregistrement peut partir.
  useEffect(() => {
    const t = window.setTimeout(() => lancerEnvoi(cle), 0);
    return () => window.clearTimeout(t);
  }, [cle]);
  // Brouillon d'un envoi jamais confirmé, que l'on ne peut pas renvoyer sans risque.
  const [interrompu, setInterrompu] = useState(false);
  useEffect(() => {
    const reprise = e || lireEnAttente(cle) ? null : envoiInterrompu(cle);
    if (!reprise) return setInterrompu(false);
    if (enBase && memeContenuSeance(reprise.saisie, enBase)) {
      effacerBrouillon(cle); // l'envoi avait réussi
      return setInterrompu(false);
    }
    // Brouillon d'avant cette version, sans la séance de référence : on ne renvoie
    // tout seul que s'il n'y a rien en base à écraser.
    const attendu = reprise.attendu !== undefined ? reprise.attendu : enBase ? undefined : null;
    if (attendu === undefined) return setInterrompu(true);
    setInterrompu(false);
    renvoyer(cle, reprise.saisie, attendu);
  }, [cle, e, enBase]);
  const suppression = useSuppressionEnAttente(cle);
  if (suppression) return <span className="pastille-envoi">Suppression…</span>;
  if (!e) {
    return interrompu ? (
      <span className="pastille-echec">Pas encore enregistrée · touche pour la retrouver</span>
    ) : null;
  }
  if (e.etat === "envoi") return <span className="pastille-envoi">Enregistrement…</span>;
  if (e.etat === "attente") {
    return (
      <span className="pastille-attente" title="Elle partira toute seule dès que le réseau revient">
        Sans réseau · partira toute seule
      </span>
    );
  }
  return (
    <span className="pastille-echec">
      {e.conflit ? "Modifiée entre-temps · touche pour choisir" : "Non enregistrée · touche pour reprendre"}
    </span>
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
        retourSensoriel("succes");
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
