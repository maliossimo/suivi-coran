import "server-only";
import { z } from "zod";
import { confirmationValide } from "@/domain/classe";
import { calculerStatsUsage, type StatsUsage } from "@/domain/usage";
import {
  creerEtablissement,
  definirActifUtilisateur,
  dernieresConnexions,
  journalRecent,
  listerEtablissements,
  listerUtilisateurs,
  seancesPourStats,
  supprimerUtilisateurDefinitivement,
  type Etablissement,
  type EvenementAudit,
  type Utilisateur,
} from "@/repositories/admin";
import type { Profil } from "@/repositories/profils";
import { aujourdhuiParis, type ResultatSaisie } from "./fiche";

function exigerAdmin(acteur: Profil) {
  if (acteur.role !== "admin" || !acteur.actif) throw new Error("Réservé à l'administrateur.");
}

export interface TableauAdmin {
  etablissements: (Etablissement & { maitres: number; eleves: number })[];
  utilisateurs: (Utilisateur & { derniereConnexion: string | null })[];
  stats: StatsUsage;
}

export async function chargerTableauAdmin(acteur: Profil): Promise<TableauAdmin> {
  exigerAdmin(acteur);
  const aujourdhui = aujourdhuiParis();
  const d = new Date(`${aujourdhui}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7 * 12);
  const [etablissements, utilisateurs, seances, connexions] = await Promise.all([
    listerEtablissements(),
    listerUtilisateurs(),
    seancesPourStats(d.toISOString().slice(0, 10)),
    dernieresConnexions().catch(() => new Map<string, string | null>()),
  ]);
  return {
    etablissements: etablissements.map((e) => ({
      ...e,
      maitres: utilisateurs.filter((u) => u.etablissementId === e.id && u.role === "maitre").length,
      eleves: utilisateurs.filter((u) => u.etablissementId === e.id && u.role === "eleve" && u.actif).length,
    })),
    utilisateurs: utilisateurs.map((u) => ({ ...u, derniereConnexion: connexions.get(u.id) ?? null })),
    stats: calculerStatsUsage(utilisateurs, etablissements, seances, aujourdhui),
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

export async function chargerJournal(
  acteur: Profil,
): Promise<{ evenements: EvenementAudit[]; noms: Map<string, string> }> {
  exigerAdmin(acteur);
  const [evenements, utilisateurs] = await Promise.all([journalRecent(150), listerUtilisateurs()]);
  const noms = new Map(utilisateurs.map((u) => [u.id, `${u.prenom} ${u.nom}`.trim() || "Sans nom"]));
  return { evenements, noms };
}
