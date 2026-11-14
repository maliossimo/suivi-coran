import "server-only";
import { listerClasses as listerClassesPresences, type Classe } from "@/repositories/presences";
import { z } from "zod";
import { ajouterJours } from "@/domain/calendrier";
import { confirmationValide, fileAVoir, JOURS_A_VOIR } from "@/domain/classe";
import { calculerStatsUsage, type StatsUsage } from "@/domain/usage";
import {
  comptesConnexion,
  dernieresOuvertures,
  ouverturesRecentes,
  type UtilisationAppli,
  creerEtablissement,
  definirActifUtilisateur,
  deplacerUtilisateur,
  derniereSauvegarde,
  enregistrerErreur,
  erreursRecentes,
  journalRecent,
  listerEtablissements,
  listerUtilisateurs,
  renommerEtablissement,
  seancesPourStats,
  supprimerEtablissement,
  supprimerUtilisateurDefinitivement,
  type CompteConnexion,
  type ErreurSignalee,
  type Etablissement,
  type EvenementAudit,
  type FiltresJournal,
  type Sauvegarde,
  type Utilisateur,
} from "@/repositories/admin";
import { MISE_EN_LIGNE, VERSION } from "@/lib/version";
import { renvoyerInvitation } from "@/repositories/invitations";
import { seancesSuiviDepuis } from "@/repositories/seances";
import type { Profil } from "@/repositories/profils";
import { aujourdhuiParis, type ResultatSaisie } from "./fiche";

function exigerAdmin(acteur: Profil) {
  if (acteur.role !== "admin" || !acteur.actif) throw new Error("Réservé à l'administrateur.");
}

function horodatage(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

function plusRecente(a: string | null, b: string | null): string | null {
  if (!a || !b) return a ?? b;
  return new Date(a) > new Date(b) ? a : b;
}

export interface TableauAdmin {
  etablissements: (Etablissement & { maitres: number; eleves: number; comptes: number })[];
  /** derniereConnexion : mot de passe saisi ; derniereUtilisation : dernière ouverture de l'appli (ou connexion). */
  utilisateurs: (Utilisateur & { derniereConnexion: string | null; derniereUtilisation: string | null })[];
  /** Comptes invités qui ne se sont jamais connectés. */
  invitationsEnAttente: (Utilisateur & { email: string | null; inviteLe: string | null })[];
  /** La clé « service role » est configurée (dernières connexions, invitations). */
  comptesLisibles: boolean;
  stats: StatsUsage;
  /** Classes en cours de chaque établissement (Cheikhs, nombre d'élèves). */
  classes: Classe[];
}

export async function chargerTableauAdmin(acteur: Profil): Promise<TableauAdmin> {
  exigerAdmin(acteur);
  const aujourdhui = aujourdhuiParis();
  const d = new Date(`${aujourdhui}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7 * 12);
  const [etablissements, utilisateurs, seances, connexions, suivi, ouvertures, classes] = await Promise.all([
    listerEtablissements(),
    listerUtilisateurs(),
    seancesPourStats(d.toISOString().slice(0, 10)),
    comptesConnexion().catch(() => new Map<string, CompteConnexion>()),
    seancesSuiviDepuis(ajouterJours(aujourdhui, -JOURS_A_VOIR)),
    dernieresOuvertures().catch(() => new Map<string, UtilisationAppli>()),
    listerClassesPresences(),
  ]);
  const aVoir = new Map([...fileAVoir(suivi)].map(([id, f]) => [id, f.nombre]));
  return {
    comptesLisibles: connexions.size > 0,
    invitationsEnAttente: utilisateurs
      .filter((u) => u.role !== "admin" && u.actif && connexions.has(u.id))
      .filter((u) => !connexions.get(u.id)!.derniereConnexion)
      .map((u) => ({ ...u, email: connexions.get(u.id)!.email, inviteLe: connexions.get(u.id)!.inviteLe })),
    etablissements: etablissements.map((e) => ({
      ...e,
      maitres: utilisateurs.filter((u) => u.etablissementId === e.id && u.role === "maitre").length,
      eleves: utilisateurs.filter((u) => u.etablissementId === e.id && u.role === "eleve" && u.actif).length,
      comptes: utilisateurs.filter((u) => u.etablissementId === e.id).length,
    })),
    utilisateurs: utilisateurs.map((u) => {
      const derniereConnexion = connexions.get(u.id)?.derniereConnexion ?? null;
      return {
        ...u,
        derniereConnexion,
        derniereUtilisation: plusRecente(derniereConnexion, ouvertures.get(u.id)?.derniere ?? null),
      };
    }),
    stats: calculerStatsUsage(utilisateurs, etablissements, seances, aujourdhui, 12, aVoir),
    classes: classes.filter((c) => !c.archivee),
  };
}

/**
 * Suppression définitive d'un élève ou d'un maître par l'admin : il faut retaper
 * le prénom (ou le nom si le prénom est vide). La base revérifie tout.
 */
export async function supprimerUtilisateur(
  acteur: Profil,
  idBrut: unknown,
  confirmation: unknown,
): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  if (!id.success) return { ok: false, erreur: "Utilisateur introuvable." };
  if (id.data === acteur.id) return { ok: false, erreur: "Tu ne peux pas supprimer ton propre compte." };
  const cible = (await listerUtilisateurs()).find((u) => u.id === id.data);
  if (!cible) return { ok: false, erreur: "Utilisateur introuvable." };
  if (cible.role === "admin") return { ok: false, erreur: "Un administrateur ne peut pas être supprimé." };
  const attendu = cible.prenom || cible.nom;
  if (!confirmationValide(attendu, typeof confirmation === "string" ? confirmation : "")) {
    return { ok: false, erreur: `Tape « ${attendu} » pour confirmer.` };
  }
  try {
    await supprimerUtilisateurDefinitivement(cible.id);
  } catch {
    return { ok: false, erreur: "La suppression a échoué. Réessaie dans un instant." };
  }
  return { ok: true };
}

export async function ajouterEtablissement(acteur: Profil, nomBrut: unknown): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const nom = z.string().trim().min(1, "Le nom est obligatoire.").max(120).safeParse(nomBrut);
  if (!nom.success) return { ok: false, erreur: nom.error.issues[0]?.message ?? "Nom invalide." };
  await creerEtablissement(nom.data);
  return { ok: true };
}

export async function basculerUtilisateur(acteur: Profil, idBrut: unknown, actif: boolean): Promise<void> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  if (!id.success || id.data === acteur.id) return; // on ne se désactive pas soi-même
  await definirActifUtilisateur(id.data, actif);
}

const schemaFiltres = z.object({
  personne: z.string().uuid().optional().catch(undefined),
  action: z.enum(["INSERT", "UPDATE", "DELETE", "SUPPRESSION_UTILISATEUR"]).optional().catch(undefined),
  table: z
    .enum([
      "seances",
      "passages",
      "objectifs",
      "bilans_mensuels",
      "commentaires",
      "profils",
      "etablissements",
      "invitations_classe",
    ])
    .optional()
    .catch(undefined),
  du: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  au: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
});

export async function chargerJournal(
  acteur: Profil,
  filtresBruts: Record<string, string | undefined> = {},
): Promise<{
  evenements: EvenementAudit[];
  noms: Map<string, string>;
  personnes: { id: string; nom: string }[];
  filtres: z.infer<typeof schemaFiltres>;
  /** Utilisation de l'appli par personne, la plus récente d'abord. */
  utilisation: {
    id: string;
    nom: string;
    role: Utilisateur["role"];
    derniereUtilisation: string | null;
    derniereConnexion: string | null;
    ouvertures7j: number;
  }[];
  /** Ouvertures de l'appli les plus récentes (date et heure). */
  ouvertures: { id: number; personneId: string; quand: string }[];
}> {
  exigerAdmin(acteur);
  const filtres = schemaFiltres.parse(filtresBruts);
  const f: FiltresJournal = {
    personneId: filtres.personne,
    action: filtres.action,
    table: filtres.table,
    du: filtres.du,
    au: filtres.au,
  };
  const [evenements, utilisateurs, comptes, dernieres, ouvertures] = await Promise.all([
    journalRecent(150, f),
    listerUtilisateurs(),
    comptesConnexion().catch(() => new Map<string, CompteConnexion>()),
    dernieresOuvertures().catch(() => new Map<string, UtilisationAppli>()),
    ouverturesRecentes(100, filtres.personne).catch(() => []),
  ]);
  const noms = new Map(utilisateurs.map((u) => [u.id, `${u.prenom} ${u.nom}`.trim() || "Sans nom"]));
  const personnes = [...noms]
    .map(([id, nom]) => ({ id, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const utilisation = utilisateurs
    .filter((u) => !filtres.personne || u.id === filtres.personne)
    .map((u) => {
      const derniereConnexion = comptes.get(u.id)?.derniereConnexion ?? null;
      return {
        id: u.id,
        nom: noms.get(u.id) ?? "Sans nom",
        role: u.role,
        derniereConnexion,
        derniereUtilisation: plusRecente(derniereConnexion, dernieres.get(u.id)?.derniere ?? null),
        ouvertures7j: dernieres.get(u.id)?.ouvertures7j ?? 0,
      };
    })
    .sort((a, b) => horodatage(b.derniereUtilisation) - horodatage(a.derniereUtilisation));
  return { evenements, noms, personnes, filtres, utilisation, ouvertures };
}

// ---------- Établissements ------------------------------------------------

const schemaNom = z.string().trim().min(1, "Le nom est obligatoire.").max(120, "120 caractères maximum.");

export async function renommerUnEtablissement(
  acteur: Profil,
  idBrut: unknown,
  nomBrut: unknown,
): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  const nom = schemaNom.safeParse(nomBrut);
  if (!id.success) return { ok: false, erreur: "Établissement introuvable." };
  if (!nom.success) return { ok: false, erreur: nom.error.issues[0]?.message ?? "Nom invalide." };
  await renommerEtablissement(id.data, nom.data);
  return { ok: true };
}

/** Suppression d'un établissement vide, en retapant son nom. */
export async function supprimerUnEtablissement(
  acteur: Profil,
  idBrut: unknown,
  confirmation: unknown,
): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  if (!id.success) return { ok: false, erreur: "Établissement introuvable." };
  const etab = (await listerEtablissements()).find((e) => e.id === id.data);
  if (!etab) return { ok: false, erreur: "Établissement introuvable." };
  if (!confirmationValide(etab.nom, typeof confirmation === "string" ? confirmation : "")) {
    return { ok: false, erreur: `Tape « ${etab.nom} » pour confirmer.` };
  }
  const supprime = await supprimerEtablissement(etab.id);
  if (!supprime) {
    return {
      ok: false,
      erreur: "Il reste des comptes dans cet établissement : déplace-les ou supprime-les d’abord.",
    };
  }
  return { ok: true };
}

/** Change un Cheikh ou un élève d'établissement. */
export async function deplacerUnUtilisateur(
  acteur: Profil,
  idBrut: unknown,
  etablissementBrut: unknown,
): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  const etab = z.string().uuid().safeParse(etablissementBrut);
  if (!id.success || !etab.success) return { ok: false, erreur: "Choisis un établissement." };
  const [utilisateurs, etablissements] = await Promise.all([listerUtilisateurs(), listerEtablissements()]);
  const cible = utilisateurs.find((u) => u.id === id.data);
  if (!cible || cible.role === "admin") return { ok: false, erreur: "Compte introuvable." };
  if (!etablissements.some((e) => e.id === etab.data))
    return { ok: false, erreur: "Établissement introuvable." };
  if (cible.etablissementId === etab.data) return { ok: true };
  await deplacerUtilisateur(cible.id, etab.data);
  return { ok: true };
}

/** Renvoie l'invitation d'un compte qui ne s'est jamais connecté. */
export async function renvoyerUneInvitation(acteur: Profil, idBrut: unknown): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  if (!id.success) return { ok: false, erreur: "Compte introuvable." };
  const r = await renvoyerInvitation(id.data);
  if (r.ok) return { ok: true };
  if (r.raison === "non_configure") return { ok: false, erreur: "Envoi d’e-mails non configuré." };
  if (r.raison === "deja_inscrit") return { ok: false, erreur: "Ce compte s’est déjà connecté." };
  return { ok: false, erreur: "L’e-mail n’a pas pu être envoyé. Réessaie dans un instant." };
}

// ---------- État du site ---------------------------------------------------

export interface EtatSite {
  version: { numero: string; commit: string | null; miseEnLigne: string | null; environnement: string };
  sauvegarde: Sauvegarde | null;
  erreurs: ErreurSignalee[];
  erreurs7j: number;
  sentryConfigure: boolean;
}

export async function chargerEtatSite(acteur: Profil): Promise<EtatSite> {
  exigerAdmin(acteur);
  const [sauvegarde, { erreurs, total7j }] = await Promise.all([
    derniereSauvegarde().catch(() => null),
    erreursRecentes(8).catch(() => ({ erreurs: [], total7j: 0 })),
  ]);
  return {
    version: {
      numero: VERSION,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      miseEnLigne: MISE_EN_LIGNE,
      environnement: process.env.VERCEL_ENV ?? "local",
    },
    sauvegarde,
    erreurs,
    erreurs7j: total7j,
    sentryConfigure: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };
}

/** Établissements, pour que l'admin choisisse une classe (invitation, QR code). */
export async function listerClasses(acteur: Profil): Promise<Etablissement[]> {
  exigerAdmin(acteur);
  return listerEtablissements();
}

/** Note une erreur rencontrée par la personne connectée (lue ensuite par l'admin). */
export async function signalerErreur(acteur: Profil | null, page: unknown, message: unknown): Promise<void> {
  if (!acteur) return;
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  await enregistrerErreur(
    String(page ?? "").slice(0, 300) || "/",
    String(message ?? "").slice(0, 500) || "Erreur inconnue",
    version,
  );
}
