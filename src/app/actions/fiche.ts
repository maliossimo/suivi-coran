"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { profilConnecte } from "@/repositories/profils";
import { notifier } from "./notification";

import { commenter } from "@/services/classe";
import {
  enregistrerBilanEleve,
  enregistrerObjectifEleve,
  enregistrerSeanceEleve,
  supprimerSeanceEleve,
  validerSeanceEleve,
  type ResultatSaisie,
} from "@/services/fiche";

/**
 * Ne rafraîchit que les pages qui montrent cet élève (sa fiche, sa progression,
 * la classe du maître), au lieu de tout le site.
 */
function revaliderEleve(eleveId: string) {
  revalidatePath("/eleve", "layout");
  revalidatePath(`/maitre/eleves/${eleveId}`, "layout");
  revalidatePath("/maitre");
}

/**
 * Actions de la fiche, communes à l'élève et au maître.
 * Le formulaire indique l'élève concerné (eleveId) ; la base vérifie le droit
 * d'écrire (RLS : l'élève lui-même, son maître ou l'admin). On contrôle ici
 * que la personne est connectée et active, et que le chemin de retour est interne.
 */

export type EtatSaisie = { erreur?: string; enregistre?: boolean };

const uuid = z.string().uuid();

async function acteurEtEleve(form: FormData) {
  const acteur = await profilConnecte();
  if (!acteur || !acteur.actif) redirect("/connexion");
  const eleveId = uuid.safeParse(form.get("eleveId"));
  if (!eleveId.success) redirect("/");
  return { acteur, eleveId: eleveId.data };
}

/**
 * Enregistrement « en arrière-plan » : le formulaire a déjà ramené l'élève sur sa fiche ;
 * on renvoie seulement le résultat (pas de redirection) et on rafraîchit ses pages.
 */
export async function actionEnregistrerSeanceFond(form: FormData): Promise<ResultatSaisie> {
  const { eleveId } = await acteurEtEleve(form);
  let passages: unknown = [];
  try {
    passages = JSON.parse(String(form.get("passages") ?? "[]"));
  } catch {
    return { ok: false, erreur: "La liste des passages est invalide." };
  }
  // Version de la séance sur laquelle l'élève a travaillé (protège des écrasements).
  let attendu: unknown = undefined;
  if (form.has("attendu")) {
    try {
      attendu = JSON.parse(String(form.get("attendu")));
    } catch {
      return { ok: false, erreur: "Certaines informations sont invalides." };
    }
  }
  let resultat: ResultatSaisie;
  try {
    resultat = await enregistrerSeanceEleve(
      eleveId,
      {
        date: String(form.get("date") ?? ""),
        type: String(form.get("type") ?? ""),
        dureeMin: form.get("dureeMin"),
        tajwid: String(form.get("tajwid") ?? ""),
        noteLibre: String(form.get("noteLibre") ?? ""),
        passages,
      },
      attendu,
    );
  } catch {
    resultat = { ok: false, erreur: "L'enregistrement a échoué. Réessaie dans un instant." };
  }
  if (resultat.ok) {
    await notifier("Séance enregistrée");
    revaliderEleve(eleveId);
  }
  return resultat;
}

/** Le Cheikh valide une séance en un geste depuis la fiche de l'élève. */
export async function actionValiderSeance(form: FormData): Promise<ResultatSaisie> {
  const { acteur, eleveId } = await acteurEtEleve(form);
  const resultat = await validerSeanceEleve(acteur, form.get("seanceId"));
  await notifier(resultat.ok ? "Séance validée" : resultat.erreur, resultat.ok ? "succes" : "erreur");
  if (resultat.ok) revaliderEleve(eleveId);
  return resultat;
}

/** Suppression différée (annulable) : appelée par le navigateur une fois le délai passé. */
export async function actionSupprimerSeanceFond(form: FormData): Promise<ResultatSaisie> {
  const { eleveId } = await acteurEtEleve(form);
  try {
    await supprimerSeanceEleve(eleveId, form.get("type"), form.get("date"));
    revaliderEleve(eleveId);
    return { ok: true };
  } catch {
    await notifier("La séance n'a pas pu être supprimée.", "erreur");
    revaliderEleve(eleveId);
    return { ok: false, erreur: "La séance n'a pas pu être supprimée." };
  }
}

export async function actionEnregistrerObjectif(form: FormData): Promise<void> {
  const { eleveId } = await acteurEtEleve(form);
  try {
    const resultat = await enregistrerObjectifEleve(eleveId, {
      type: form.get("type"),
      mois: form.get("mois"),
      semaine: form.get("semaine") ?? "",
      description: form.get("description"),
      statut: form.get("statut") ?? "en_cours",
    });
    await notifier(resultat.ok ? "Objectif enregistré" : resultat.erreur, resultat.ok ? "succes" : "erreur");
  } catch {
    await notifier("L'objectif n'a pas pu être enregistré.", "erreur");
  }
  revaliderEleve(eleveId);
}

export async function actionCommenter(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const { acteur, eleveId } = await acteurEtEleve(form);
  const resultat = await commenter(acteur, eleveId, {
    cible: form.get("cible"),
    cibleId: form.get("cibleId"),
    texte: form.get("texte"),
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Commentaire publié");
  revaliderEleve(eleveId);
  return {};
}

export async function actionEnregistrerBilan(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const { eleveId } = await acteurEtEleve(form);
  let resultat: ResultatSaisie;
  try {
    resultat = await enregistrerBilanEleve(eleveId, {
      type: form.get("type"),
      mois: form.get("mois"),
      bienMemorise: form.get("bienMemorise") ?? "",
      aRenforcer: form.get("aRenforcer") ?? "",
    });
  } catch {
    resultat = { ok: false, erreur: "L'enregistrement a échoué. Réessaie dans un instant." };
  }
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Bilan enregistré");
  revaliderEleve(eleveId);
  return { enregistre: true };
}
