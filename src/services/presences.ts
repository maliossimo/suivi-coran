import "server-only";
import { z } from "zod";
import { ajouterJours, formaterDate, lireDate, type DateISO } from "@/domain/calendrier";
import {
  SEUIL_ABSENCES,
  absencesDAffilee,
  aCoursLe,
  joursDeCoursDuMois,
  prochainCours,
  resumeAppel,
  tauxPresence,
  type StatutPresence,
} from "@/domain/presences";
import { listerEtablissements } from "@/repositories/admin";
import {
  ajouterMembre,
  appelsEntre,
  changerMembreActif,
  creerClasse,
  definirCheikhs,
  derniersAppels,
  enregistrerAppel,
  lireClasse,
  listerClasses,
  membresClasse,
  modifierClasse,
  personnesEtablissement,
  type Classe,
  type MembreClasse,
} from "@/repositories/presences";
import type { Profil } from "@/repositories/profils";
import { redirect } from "next/navigation";
import { accueilDuRole } from "@/domain/roles";
import { exigerConnexion } from "./acces";
import { aujourdhuiParis, type ResultatSaisie } from "./fiche";

/**
 * Version de test : les présences ne sont ouvertes qu'à l'administrateur.
 * Pour les ouvrir aux Cheikhs (et plus tard au responsable de la mosquée), il suffit
 * d'élargir ces deux fonctions : la base applique déjà les bons droits.
 */
export function peutVoirPresences(profil: Profil): boolean {
  return profil.actif && profil.role === "admin";
}
export function peutFaireAppel(profil: Profil): boolean {
  return profil.actif && profil.role === "admin";
}

/** Garde des pages « Présences ». */
export async function exigerPresences(): Promise<Profil> {
  const profil = await exigerConnexion();
  if (!peutVoirPresences(profil)) redirect(accueilDuRole(profil.role));
  return profil;
}

function exigerVue(acteur: Profil) {
  if (!peutVoirPresences(acteur)) throw new Error("Présences non disponibles pour ce compte.");
}
function exigerAppel(acteur: Profil): ResultatSaisie | null {
  return peutFaireAppel(acteur) ? null : { ok: false, erreur: "Seul le Cheikh de la classe fait l’appel." };
}

const schemaId = z.string().uuid();
const schemaDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------- Accueil -------------------------------------------------------

export interface ClasseAccueil extends Classe {
  etablissement: string;
  coursAujourdhui: boolean;
  appelFait: boolean;
  prochainCours: DateISO | null;
  dernierAppel: { date: DateISO; resume: Record<StatutPresence, number> } | null;
}

export async function chargerAccueilPresences(acteur: Profil) {
  exigerVue(acteur);
  const aujourdhui = aujourdhuiParis();
  const [classes, appels, etablissements] = await Promise.all([
    listerClasses(),
    derniersAppels(ajouterJours(aujourdhui, -30)),
    listerEtablissements(),
  ]);
  const nomEtab = new Map(etablissements.map((e) => [e.id, e.nom]));
  const liste: ClasseAccueil[] = classes
    .filter((c) => !c.archivee)
    .map((c) => {
      const siens = appels.filter((a) => a.classeId === c.id);
      const dernier = siens[0];
      return {
        ...c,
        etablissement: nomEtab.get(c.etablissementId) ?? "",
        coursAujourdhui: aCoursLe(c.jours, aujourdhui),
        appelFait: siens.some((a) => a.date === aujourdhui),
        prochainCours: prochainCours(c.jours, aujourdhui),
        dernierAppel: dernier ? { date: dernier.date, resume: resumeAppel(dernier.statuts) } : null,
      };
    })
    .sort(
      (a, b) => Number(b.coursAujourdhui) - Number(a.coursAujourdhui) || a.nom.localeCompare(b.nom, "fr"),
    );
  return {
    aujourdhui,
    classes: liste,
    archivees: classes.filter((c) => c.archivee),
    peutCreer: peutFaireAppel(acteur),
  };
}

// ---------- Une classe : tableau du mois ----------------------------------

export interface LigneMois {
  membre: MembreClasse;
  statuts: (StatutPresence | null)[];
  taux: number | null;
  absencesDAffilee: number;
}

export async function chargerClasseMois(acteur: Profil, idBrut: unknown, moisBrut: unknown) {
  exigerVue(acteur);
  const id = schemaId.safeParse(idBrut);
  if (!id.success) return null;
  const classe = await lireClasse(id.data);
  if (!classe) return null;
  const aujourdhui = aujourdhuiParis();
  const { annee: anneeAuj, mois: moisAuj } = lireDate(aujourdhui);
  const m = z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .safeParse(moisBrut);
  const [annee, mois] = m.success ? m.data.split("-").map(Number) : [anneeAuj, moisAuj];
  const debut = formaterDate(annee!, mois!, 1);
  const fin = ajouterJours(
    formaterDate(mois === 12 ? annee! + 1 : annee!, mois === 12 ? 1 : mois! + 1, 1),
    -1,
  );
  const [membres, appels, historique] = await Promise.all([
    membresClasse(classe.id),
    appelsEntre(classe.id, debut, fin),
    // Pour les absences d'affilée : les 3 derniers mois.
    appelsEntre(classe.id, ajouterJours(aujourdhui, -90), aujourdhui),
  ]);
  const dates = [
    ...new Set([
      ...joursDeCoursDuMois(classe.jours, annee!, mois!, aujourdhui),
      ...appels.map((a) => a.date),
    ]),
  ].sort();
  const parDate = new Map(appels.map((a) => [a.date, a]));
  const lignes: LigneMois[] = membres
    .filter((mb) => mb.actif || appels.some((a) => a.presences.has(mb.id)))
    .map((mb) => {
      const statuts = dates.map((d) => parDate.get(d)?.presences.get(mb.id)?.statut ?? null);
      const passes = historique
        .map((a) => a.presences.get(mb.id)?.statut)
        .filter((s): s is StatutPresence => !!s);
      return {
        membre: mb,
        statuts,
        taux: tauxPresence(statuts.filter((s): s is StatutPresence => s !== null)),
        absencesDAffilee: mb.actif ? absencesDAffilee(passes) : 0,
      };
    });
  const tous = lignes.flatMap((l) => l.statuts.filter((s): s is StatutPresence => s !== null));
  return {
    classe,
    mois: `${annee}-${String(mois).padStart(2, "0")}`,
    aujourdhui,
    dates,
    appelsFaits: new Set(appels.map((a) => a.date)),
    lignes,
    taux: tauxPresence(tous),
    aSurveiller: lignes.filter((l) => l.absencesDAffilee >= SEUIL_ABSENCES),
    peutAppel: peutFaireAppel(acteur),
  };
}

// ---------- L'appel --------------------------------------------------------

export async function chargerAppel(acteur: Profil, idBrut: unknown, dateBrute: unknown) {
  exigerVue(acteur);
  const id = schemaId.safeParse(idBrut);
  if (!id.success) return null;
  const classe = await lireClasse(id.data);
  if (!classe) return null;
  const aujourdhui = aujourdhuiParis();
  const d = schemaDate.safeParse(dateBrute);
  const date = d.success && d.data <= aujourdhui ? d.data : aujourdhui;
  const [membres, appels] = await Promise.all([membresClasse(classe.id), appelsEntre(classe.id, date, date)]);
  const appel = appels[0] ?? null;
  return {
    classe,
    date,
    aujourdhui,
    coursCeJour: aCoursLe(classe.jours, date),
    membres: membres.filter((m) => m.actif),
    deja: appel
      ? Object.fromEntries(
          [...appel.presences].map(([m, p]) => [m, { statut: p.statut, note: p.note ?? "" }]),
        )
      : null,
    faitLe: appel?.faitLe ?? null,
    peutAppel: peutFaireAppel(acteur),
  };
}

const schemaAppel = z.object({
  classe: schemaId,
  date: schemaDate,
  presences: z
    .array(
      z.object({
        membre: schemaId,
        statut: z.enum(["present", "absent", "retard", "excuse"]),
        note: z.string().trim().max(200).nullable().catch(null),
      }),
    )
    .max(200),
});

export async function enregistrerUnAppel(acteur: Profil, brut: unknown): Promise<ResultatSaisie> {
  const refus = exigerAppel(acteur);
  if (refus) return refus;
  const p = schemaAppel.safeParse(brut);
  if (!p.success) return { ok: false, erreur: "Appel incomplet : recharge la page." };
  if (p.data.date > aujourdhuiParis())
    return { ok: false, erreur: "On ne fait pas l’appel d’un cours à venir." };
  try {
    await enregistrerAppel(
      p.data.classe,
      p.data.date,
      p.data.presences.map((x) => ({ ...x, note: x.note || null })),
    );
    return { ok: true };
  } catch {
    return { ok: false, erreur: "L’appel n’a pas pu être enregistré. Réessaie." };
  }
}

// ---------- Créer et modifier une classe -----------------------------------

const schemaClasse = z.object({
  nom: z.string().trim().min(1, "Donne un nom à la classe.").max(60),
  jours: z.array(z.coerce.number().int().min(1).max(7)).max(7),
  cheikhs: z.array(schemaId).max(10),
});

export async function chargerFormulaireClasse(acteur: Profil, idBrut?: unknown, etablissementBrut?: unknown) {
  if (!peutFaireAppel(acteur)) throw new Error("Seul le Cheikh de la classe gère la classe.");
  const etablissements = (await listerEtablissements()).filter((e) => e.actif);
  const classe = idBrut ? await lireClasse(schemaId.parse(idBrut)) : null;
  const etab =
    classe?.etablissementId ??
    (schemaId.safeParse(etablissementBrut).success ? String(etablissementBrut) : etablissements[0]?.id);
  const [personnes, membres] = await Promise.all([
    etab ? personnesEtablissement(etab) : Promise.resolve({ eleves: [], maitres: [] }),
    classe ? membresClasse(classe.id) : Promise.resolve([]),
  ]);
  return { etablissements, etablissementId: etab ?? null, classe, personnes, membres };
}

export async function creerUneClasse(
  acteur: Profil,
  form: FormData,
): Promise<ResultatSaisie & { id?: string }> {
  const refus = exigerAppel(acteur);
  if (refus) return refus;
  const etab = schemaId.safeParse(form.get("etablissement"));
  const p = schemaClasse.safeParse({
    nom: form.get("nom"),
    jours: form.getAll("jours"),
    cheikhs: form.getAll("cheikhs"),
  });
  if (!etab.success) return { ok: false, erreur: "Choisis l’établissement." };
  if (!p.success) return { ok: false, erreur: p.error.issues[0]?.message ?? "Classe invalide." };
  try {
    const id = await creerClasse({ etablissementId: etab.data, ...p.data });
    return { ok: true, id };
  } catch {
    return { ok: false, erreur: "La classe n’a pas pu être créée." };
  }
}

export async function modifierUneClasse(acteur: Profil, form: FormData): Promise<ResultatSaisie> {
  const refus = exigerAppel(acteur);
  if (refus) return refus;
  const id = schemaId.safeParse(form.get("id"));
  const p = schemaClasse.safeParse({
    nom: form.get("nom"),
    jours: form.getAll("jours"),
    cheikhs: form.getAll("cheikhs"),
  });
  if (!id.success) return { ok: false, erreur: "Classe introuvable." };
  if (!p.success) return { ok: false, erreur: p.error.issues[0]?.message ?? "Classe invalide." };
  try {
    await modifierClasse(id.data, {
      nom: p.data.nom,
      jours: p.data.jours,
      archivee: form.get("archivee") === "on",
    });
    await definirCheikhs(id.data, p.data.cheikhs);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "La classe n’a pas pu être modifiée." };
  }
}

export async function ajouterUnMembre(acteur: Profil, form: FormData): Promise<ResultatSaisie> {
  const refus = exigerAppel(acteur);
  if (refus) return refus;
  const classe = schemaId.safeParse(form.get("classe"));
  if (!classe.success) return { ok: false, erreur: "Classe introuvable." };
  const eleve = schemaId.safeParse(form.get("eleve"));
  const sansCompte = z
    .object({
      prenom: z.string().trim().min(1, "Écris au moins le prénom.").max(60),
      nom: z.string().trim().max(60),
    })
    .safeParse({ prenom: form.get("prenom"), nom: form.get("nom") ?? "" });
  if (!eleve.success && !sansCompte.success) {
    return { ok: false, erreur: sansCompte.error.issues[0]?.message ?? "Élève invalide." };
  }
  try {
    await ajouterMembre(classe.data, eleve.success ? { eleveId: eleve.data } : sansCompte.data!);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "L’élève n’a pas pu être ajouté." };
  }
}

export async function changerUnMembre(acteur: Profil, form: FormData): Promise<ResultatSaisie> {
  const refus = exigerAppel(acteur);
  if (refus) return refus;
  const id = schemaId.safeParse(form.get("membre"));
  if (!id.success) return { ok: false, erreur: "Élève introuvable." };
  try {
    await changerMembreActif(id.data, form.get("actif") === "true");
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Modification impossible." };
  }
}
