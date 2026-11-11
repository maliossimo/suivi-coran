import "server-only";
import { z } from "zod";
import { confirmationValide, resumerClasse, type ResumeEleve } from "@/domain/classe";
import { decalerMois, dernierJour, lireMois, premierJour, type Mois } from "@/domain/fiche";
import { ajouterCommentaire } from "@/repositories/commentaires";
import { inviter } from "@/repositories/invitations";
import { statutsObjectifsDuMois } from "@/repositories/objectifs";
import {
  definirActif,
  eleveParId,
  listerEleves,
  supprimerEleveDefinitivement,
  type Profil,
} from "@/repositories/profils";
import { dernieresSaisies, statsSeancesEntre } from "@/repositories/seances";
import { aujourdhuiParis, type ResultatSaisie } from "./fiche";

export interface Classe {
  mois: Mois;
  actifs: ResumeEleve[];
  archives: ResumeEleve[];
}

/** Tableau de bord : résumé du mois pour chaque élève visible. */
export async function chargerClasse(moisParam?: string): Promise<Classe> {
  const aujourdhui = aujourdhuiParis();
  const mois = lireMois(moisParam, aujourdhui);
  const depuis = premierJour(decalerMois(mois, -3));
  const [eleves, seances, objectifs, dernieres] = await Promise.all([
    listerEleves(),
    statsSeancesEntre(premierJour(mois), dernierJour(mois)),
    statutsObjectifsDuMois(premierJour(mois)),
    dernieresSaisies(depuis),
  ]);
  const resumes = resumerClasse(eleves, seances, objectifs, dernieres, aujourdhui);
  return {
    mois,
    actifs: resumes.filter((r) => r.eleve.actif),
    archives: resumes.filter((r) => !r.eleve.actif),
  };
}

export { eleveParId as chargerEleve };

function estEncadrant(acteur: Profil): boolean {
  return acteur.actif && (acteur.role === "maitre" || acteur.role === "admin");
}

const schemaCommentaire = z.object({
  cible: z.enum(["seance", "bilan"]),
  cibleId: z.string().uuid(),
  texte: z.string().trim().min(1, "Le commentaire est vide.").max(1000, "1000 caractères maximum."),
});

/** Commentaire du maître (ou de l'admin) sur une séance ou sur un bilan mensuel. */
export async function commenter(
  acteur: Profil,
  eleveId: string,
  brut: { cible: unknown; cibleId: unknown; texte: unknown },
): Promise<ResultatSaisie> {
  if (!estEncadrant(acteur)) return { ok: false, erreur: "Seul le maître peut commenter." };
  const saisie = schemaCommentaire.safeParse(brut);
  if (!saisie.success)
    return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Commentaire invalide." };
  const { cible, cibleId, texte } = saisie.data;
  try {
    await ajouterCommentaire(
      eleveId,
      acteur.id,
      cible === "seance" ? { seanceId: cibleId } : { bilanId: cibleId },
      texte,
    );
  } catch {
    return { ok: false, erreur: "Le commentaire n'a pas pu être publié." };
  }
  return { ok: true };
}

// ---------- Invitations ---------------------------------------------------

const schemaInvitation = z.object({
  prenom: z.string().trim().min(1, "Le prénom est obligatoire.").max(60),
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(60),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

const MESSAGES_INVITATION = {
  non_configure:
    "Les invitations ne sont pas encore activées (clé « service role » et envoi d'e-mails à configurer).",
  deja_inscrit: "Cette adresse a déjà un compte.",
  echec: "L'invitation n'a pas pu être envoyée. Réessaie plus tard.",
} as const;

/** Un maître invite un élève dans SON établissement. */
export async function inviterEleve(
  acteur: Profil,
  brut: { prenom: unknown; nom: unknown; email: unknown },
): Promise<ResultatSaisie> {
  if (acteur.role !== "maitre" || !acteur.actif || !acteur.etablissementId) {
    return { ok: false, erreur: "Seul un maître rattaché à un établissement peut inviter un élève." };
  }
  const saisie = schemaInvitation.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Saisie invalide." };

  const resultat = await inviter(saisie.data.email, {
    prenom: saisie.data.prenom,
    nom: saisie.data.nom,
    role: "eleve",
    etablissementId: acteur.etablissementId,
  });
  return resultat.ok ? { ok: true } : { ok: false, erreur: MESSAGES_INVITATION[resultat.raison] };
}

/** L'admin invite un maître dans un établissement donné. */
export async function inviterMaitre(
  acteur: Profil,
  brut: { prenom: unknown; nom: unknown; email: unknown; etablissementId: unknown },
): Promise<ResultatSaisie> {
  if (acteur.role !== "admin" || !acteur.actif) return { ok: false, erreur: "Réservé à l'administrateur." };
  const saisie = schemaInvitation
    .extend({ etablissementId: z.string().uuid("Choisis un établissement.") })
    .safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Saisie invalide." };

  const resultat = await inviter(saisie.data.email, {
    prenom: saisie.data.prenom,
    nom: saisie.data.nom,
    role: "maitre",
    etablissementId: saisie.data.etablissementId,
  });
  return resultat.ok ? { ok: true } : { ok: false, erreur: MESSAGES_INVITATION[resultat.raison] };
}

export async function archiverEleve(
  acteur: Profil,
  eleveId: unknown,
  actif: boolean,
): Promise<ResultatSaisie> {
  if (!estEncadrant(acteur)) return { ok: false, erreur: "Action réservée au maître." };
  const id = z.string().uuid().safeParse(eleveId);
  if (!id.success) return { ok: false, erreur: "Élève introuvable." };
  try {
    await definirActif(id.data, actif);
  } catch {
    return { ok: false, erreur: "La modification n'a pas pu être enregistrée." };
  }
  return { ok: true };
}

/**
 * Suppression définitive : l'élève doit être archivé et la personne doit
 * retaper son prénom. La base revérifie les droits dans supprimer_eleve().
 */
export async function supprimerEleve(
  acteur: Profil,
  eleveIdBrut: unknown,
  confirmation: unknown,
): Promise<ResultatSaisie> {
  if (!estEncadrant(acteur)) return { ok: false, erreur: "Action réservée au maître." };
  const id = z.string().uuid().safeParse(eleveIdBrut);
  const eleve = id.success ? await eleveParId(id.data) : null;
  if (!eleve) return { ok: false, erreur: "Élève introuvable." };
  if (eleve.actif) return { ok: false, erreur: "Archive l'élève avant de le supprimer." };
  if (!confirmationValide(eleve.prenom, typeof confirmation === "string" ? confirmation : "")) {
    return { ok: false, erreur: `Tape « ${eleve.prenom} » pour confirmer.` };
  }
  try {
    await supprimerEleveDefinitivement(eleve.id);
  } catch {
    return { ok: false, erreur: "La suppression a échoué. Réessaie dans un instant." };
  }
  return { ok: true };
}
