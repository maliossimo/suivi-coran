import "server-only";
import { z } from "zod";
import {
  compterSeancesDepuis,
  creerEtablissement,
  definirActifUtilisateur,
  journalRecent,
  listerEtablissements,
  listerUtilisateurs,
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
  utilisateurs: Utilisateur[];
  seances7j: number;
}

export async function chargerTableauAdmin(acteur: Profil): Promise<TableauAdmin> {
  exigerAdmin(acteur);
  const d = new Date(`${aujourdhuiParis()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  const [etablissements, utilisateurs, seances7j] = await Promise.all([
    listerEtablissements(),
    listerUtilisateurs(),
    compterSeancesDepuis(d.toISOString().slice(0, 10)),
  ]);
  return {
    etablissements: etablissements.map((e) => ({
      ...e,
      maitres: utilisateurs.filter((u) => u.etablissementId === e.id && u.role === "maitre").length,
      eleves: utilisateurs.filter((u) => u.etablissementId === e.id && u.role === "eleve" && u.actif).length,
    })),
    utilisateurs,
    seances7j,
  };
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
