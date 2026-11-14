import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ajouterJours } from "@/domain/calendrier";
import {
  confirmationValide,
  fileAVoir,
  JOURS_A_VOIR,
  resumerClasse,
  type ResumeEleve,
} from "@/domain/classe";
import { etatInvitation, expirationDepuis, type InvitationClasse } from "@/domain/invitation";
import { decalerMois, dernierJour, lireMois, premierJour, type Mois } from "@/domain/fiche";
import { ajouterCommentaire } from "@/repositories/commentaires";
import {
  creerInvitation,
  desactiverInvitations,
  invitationActive,
  inviter,
  type PorteeInvitation,
} from "@/repositories/invitations";
import { statutsObjectifsDuMois } from "@/repositories/objectifs";
import {
  definirActif,
  eleveParId,
  listerEleves,
  supprimerEleveDefinitivement,
  type Profil,
} from "@/repositories/profils";
import { dernieresSaisies, seancesSuiviDepuis, statsSeancesEntre } from "@/repositories/seances";
import { listerClasses as listerClassesPresences, membresClasse } from "@/repositories/presences";
import { aujourdhuiParis, type ResultatSaisie } from "./fiche";

export interface Classe {
  mois: Mois;
  actifs: ResumeEleve[];
  archives: ResumeEleve[];
}

/** Tableau de bord : résumé du mois pour chaque élève visible. */
export async function chargerClasse(moisParam?: string, etablissementId?: string): Promise<Classe> {
  const aujourdhui = aujourdhuiParis();
  const mois = lireMois(moisParam, aujourdhui);
  const depuis = premierJour(decalerMois(mois, -3));
  const [eleves, seances, objectifs, dernieres, aVoir] = await Promise.all([
    listerEleves(),
    statsSeancesEntre(premierJour(mois), dernierJour(mois)),
    statutsObjectifsDuMois(premierJour(mois)),
    dernieresSaisies(depuis),
    seancesSuiviDepuis(ajouterJours(aujourdhui, -JOURS_A_VOIR)),
  ]);
  // L'admin peut regarder une seule classe ; le Cheikh ne voit de toute façon que la sienne (RLS).
  const visibles = etablissementId ? eleves.filter((e) => e.etablissementId === etablissementId) : eleves;
  const resumes = resumerClasse(visibles, seances, objectifs, dernieres, aujourdhui, fileAVoir(aVoir));
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
  if (!estEncadrant(acteur)) return { ok: false, erreur: "Seul le Cheikh peut commenter." };
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
  brut: { prenom: unknown; nom: unknown; email: unknown; etablissementId?: unknown; classe?: unknown },
): Promise<ResultatSaisie> {
  // Le maître invite dans sa classe ; l'admin dans la classe qu'il a choisie.
  const etablissementId = classeCible(acteur, brut.etablissementId);
  if (!etablissementId) {
    return {
      ok: false,
      erreur:
        acteur.role === "admin"
          ? "Choisis d'abord un établissement."
          : "Seul un Cheikh rattaché à un établissement peut inviter un élève.",
    };
  }
  const saisie = schemaInvitation.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Saisie invalide." };

  const resultat = await inviter(saisie.data.email, {
    prenom: saisie.data.prenom,
    nom: saisie.data.nom,
    role: "eleve",
    etablissementId,
    classeId: await classeInvitation(acteur, brut.classe),
  });
  return resultat.ok ? { ok: true } : { ok: false, erreur: MESSAGES_INVITATION[resultat.raison] };
}

/** L'admin invite un maître dans un établissement donné. */
export async function inviterMaitre(
  acteur: Profil,
  brut: { prenom: unknown; nom: unknown; email: unknown; etablissementId: unknown; classe?: unknown },
): Promise<ResultatSaisie> {
  if (acteur.role !== "admin" || !acteur.actif) return { ok: false, erreur: "Réservé à l'administrateur." };
  const saisie = schemaInvitation
    .extend({
      etablissementId: z.string().uuid("Choisis un établissement."),
      classe: z
        .union([z.literal(""), z.string().uuid()])
        .nullish()
        .transform((v) => v || null),
    })
    .safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Saisie invalide." };
  // La classe doit être en cours, dans l'établissement choisi (la base le revérifie).
  if (saisie.data.classe) {
    const classe = (await listerClassesPresences()).find((c) => c.id === saisie.data.classe);
    if (!classe || classe.archivee || classe.etablissementId !== saisie.data.etablissementId) {
      return { ok: false, erreur: "Cette classe n’est pas dans l’établissement choisi." };
    }
  }

  const resultat = await inviter(saisie.data.email, {
    prenom: saisie.data.prenom,
    nom: saisie.data.nom,
    role: "maitre",
    etablissementId: saisie.data.etablissementId,
    classeId: saisie.data.classe,
  });
  return resultat.ok ? { ok: true } : { ok: false, erreur: MESSAGES_INVITATION[resultat.raison] };
}

export async function archiverEleve(
  acteur: Profil,
  eleveId: unknown,
  actif: boolean,
): Promise<ResultatSaisie> {
  if (!estEncadrant(acteur)) return { ok: false, erreur: "Action réservée au Cheikh." };
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
  if (!estEncadrant(acteur)) return { ok: false, erreur: "Action réservée au Cheikh." };
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

// ---------- Classes du Cheikh ----------------------------------------------

export interface ClasseDuCheikh {
  id: string;
  nom: string;
  /** Élèves avec un compte, membres actifs de la classe. */
  eleveIds: string[];
}

/** Classes (en cours) dont l'acteur est Cheikh, avec leurs élèves ; vide pour les autres rôles. */
export async function classesDuCheikh(acteur: Profil): Promise<ClasseDuCheikh[]> {
  if (!acteur.actif || acteur.role !== "maitre") return [];
  const classes = (await listerClassesPresences()).filter(
    (c) => !c.archivee && c.cheikhs.some((ch) => ch.id === acteur.id),
  );
  return Promise.all(
    classes.map(async (c) => ({
      id: c.id,
      nom: c.nom,
      eleveIds: (await membresClasse(c.id)).filter((m) => m.actif && m.eleveId).map((m) => m.eleveId!),
    })),
  );
}

/** Classe où entre un élève invité par ce Cheikh : celle choisie, ou la seule qu'il a. */
async function classeInvitation(acteur: Profil, choixBrut?: unknown): Promise<string | null> {
  const classes = await classesDuCheikh(acteur);
  const choix = z.string().uuid().safeParse(choixBrut);
  if (choix.success && classes.some((c) => c.id === choix.data)) return choix.data;
  return classes.length === 1 ? classes[0]!.id : null;
}

// ---------- Invitation par QR code ----------------------------------------

/**
 * Classe visée : celle du maître, ou celle choisie par l'admin.
 * Null si l'acteur n'a pas le droit ou si le choix est invalide.
 */
function classeCible(acteur: Profil, etablissementBrut?: unknown): string | null {
  if (!acteur.actif) return null;
  if (acteur.role === "maitre") return acteur.etablissementId;
  if (acteur.role === "admin") {
    const id = z.string().uuid().safeParse(etablissementBrut);
    return id.success ? id.data : null;
  }
  return null;
}

/** Code QR actif de la classe (celle du maître, ou celle choisie par l'admin), ou null. */
export async function chargerQrClasse(
  acteur: Profil,
  etablissementBrut?: unknown,
  classeBrut?: unknown,
): Promise<InvitationClasse | null> {
  const etablissementId = classeCible(acteur, etablissementBrut);
  if (!etablissementId) return null;
  const invitation = await invitationActive(etablissementId, await porteeQr(acteur, classeBrut));
  return invitation && etatInvitation(invitation, new Date()) === "valide" ? invitation : null;
}

/** Crée un nouveau QR code (l'ancien est désactivé). */
/** Un Cheikh gère SES codes (un par classe) ; l'admin, ceux de tout l'établissement. */
async function porteeQr(acteur: Profil, classeBrut?: unknown): Promise<PorteeInvitation> {
  if (acteur.role !== "maitre") return {};
  return { creePar: acteur.id, classeId: await classeInvitation(acteur, classeBrut) };
}

export async function genererQrClasse(
  acteur: Profil,
  etablissementBrut?: unknown,
  classeBrut?: unknown,
): Promise<ResultatSaisie> {
  const etablissementId = classeCible(acteur, etablissementBrut);
  if (!etablissementId) {
    return {
      ok: false,
      erreur:
        acteur.role === "admin"
          ? "Choisis d'abord un établissement."
          : "Seul un Cheikh rattaché à une classe peut créer un QR code.",
    };
  }
  try {
    const portee = await porteeQr(acteur, classeBrut);
    await desactiverInvitations(etablissementId, portee);
    await creerInvitation({
      etablissementId,
      creePar: acteur.id,
      classeId: portee.classeId ?? null,
      code: randomBytes(18).toString("base64url"),
      expireLe: expirationDepuis(new Date()),
    });
  } catch {
    return { ok: false, erreur: "Le QR code n'a pas pu être créé." };
  }
  return { ok: true };
}

export async function desactiverQrClasse(
  acteur: Profil,
  etablissementBrut?: unknown,
  classeBrut?: unknown,
): Promise<ResultatSaisie> {
  const etablissementId = classeCible(acteur, etablissementBrut);
  if (!etablissementId) return { ok: false, erreur: "Action réservée au Cheikh de la classe ou à l'admin." };
  try {
    await desactiverInvitations(etablissementId, await porteeQr(acteur, classeBrut));
  } catch {
    return { ok: false, erreur: "Le QR code n'a pas pu être désactivé." };
  }
  return { ok: true };
}
