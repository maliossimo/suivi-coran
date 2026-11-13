import "server-only";
import { z } from "zod";
import { ajouterJours, formaterDate, lireDate, type DateISO } from "@/domain/calendrier";
import {
  SEUIL_ABSENCES,
  STATUTS,
  absencesDAffilee,
  aCoursLe,
  capacites,
  joursDeCoursDuMois,
  joursDeCoursEntre,
  lirePeriode,
  prochainCours,
  resumeAppel,
  tauxPresence,
  type Capacites,
  type Periode,
  type PointDeVue,
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
 * Point de vue du compte sur les présences ; null : pas d'accès.
 *
 * Version de test : seul l'administrateur y a accès. Pour ouvrir la fonctionnalité,
 * il suffit de rendre ici « cheikh » aux maîtres et « responsable » aux responsables :
 * la base applique déjà les droits de chacun (voir supabase/tests/rls_test.sql).
 */
function vueDuCompte(profil: Profil): PointDeVue | null {
  if (!profil.actif) return null;
  return profil.role === "admin" ? "admin" : null;
}

export function peutVoirPresences(profil: Profil): boolean {
  return vueDuCompte(profil) !== null;
}

/** Ce que la page affiche : le point de vue (éventuellement en aperçu) et ce qu'il permet. */
export interface AccesPresences {
  profil: Profil;
  vue: PointDeVue;
  /** L'admin regarde avec les yeux d'un autre rôle (lecture seule côté serveur inchangée). */
  apercu: PointDeVue | null;
  peut: Capacites;
}

const schemaApercu = z.enum(["cheikh", "responsable"]);

/** Garde des pages « Présences » ; `?vue=cheikh|responsable` : aperçu réservé à l'admin. */
export async function exigerPresences(vueDemandee?: unknown): Promise<AccesPresences> {
  const profil = await exigerConnexion();
  const vue = vueDuCompte(profil);
  if (!vue) redirect(accueilDuRole(profil.role));
  const a = schemaApercu.safeParse(vueDemandee);
  const apercu = vue === "admin" && a.success ? a.data : null;
  const effective = apercu ?? vue;
  return { profil, vue: effective, apercu, peut: capacites(effective) };
}

type Action = keyof Capacites;
const REFUS: Record<Action, string> = {
  appel: "Seul le Cheikh de la classe fait l’appel.",
  organiser: "Seul le responsable de la mosquée organise les classes.",
  eleves: "Tu ne peux pas modifier les élèves de cette classe.",
  rapport: "Le rapport est réservé au responsable de la mosquée.",
};

/** Garde des écritures : toujours le vrai rôle du compte, jamais l'aperçu. */
function refuser(acteur: Profil, action: Action): ResultatSaisie | null {
  const vue = vueDuCompte(acteur);
  return vue && capacites(vue)[action] ? null : { ok: false, erreur: REFUS[action] };
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

export async function chargerAccueilPresences() {
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
  };
}

// ---------- Une classe : tableau du mois ----------------------------------

export interface LigneMois {
  membre: MembreClasse;
  statuts: (StatutPresence | null)[];
  taux: number | null;
  absencesDAffilee: number;
}

export async function chargerClasseMois(idBrut: unknown, moisBrut: unknown) {
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
  };
}

// ---------- L'appel --------------------------------------------------------

export async function chargerAppel(idBrut: unknown, dateBrute: unknown) {
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
  };
}

const schemaAppel = z.object({
  classe: schemaId,
  date: schemaDate,
  presences: z
    .array(
      z.object({
        membre: schemaId,
        statut: z.enum(STATUTS),
        note: z.string().trim().max(200).nullable().catch(null),
      }),
    )
    .max(200),
});

export async function enregistrerUnAppel(acteur: Profil, brut: unknown): Promise<ResultatSaisie> {
  const refus = refuser(acteur, "appel");
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

export async function chargerFormulaireClasse(idBrut?: unknown, etablissementBrut?: unknown) {
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
  const refus = refuser(acteur, "organiser");
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
  const refus = refuser(acteur, "organiser");
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
  const refus = refuser(acteur, "eleves");
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
  const refus = refuser(acteur, "eleves");
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

// ---------- Rapport du responsable -----------------------------------------

export interface LigneRapport {
  membre: MembreClasse;
  /** Statut à chaque date de la période (null : pas d'appel ce jour-là). */
  statuts: (StatutPresence | null)[];
  presences: number;
  absences: number;
  taux: number | null;
}

export interface ClasseRapport {
  classe: Classe;
  dates: DateISO[];
  appelsFaits: Set<DateISO>;
  lignes: LigneRapport[];
  taux: number | null;
}

/**
 * Présences d'une période pour une classe ou toutes : de quoi imprimer le PDF
 * sans passer par le Cheikh.
 */
export async function chargerRapport(brut: { du?: unknown; au?: unknown; classe?: unknown }) {
  const aujourdhui = aujourdhuiParis();
  const periode: Periode = lirePeriode(brut.du, brut.au, aujourdhui);
  const toutes = (await listerClasses()).filter((c) => !c.archivee);
  const choix = schemaId.safeParse(brut.classe);
  const retenues = choix.success ? toutes.filter((c) => c.id === choix.data) : toutes;
  // Pas de jour à venir dans le rapport : l'appel n'a pas encore pu être fait.
  const fin = periode.au < aujourdhui ? periode.au : aujourdhui;

  const classes: ClasseRapport[] = await Promise.all(
    retenues.map(async (classe) => {
      const [membres, appels] = await Promise.all([
        membresClasse(classe.id),
        periode.du <= fin ? appelsEntre(classe.id, periode.du, fin) : Promise.resolve([]),
      ]);
      const dates = [
        ...new Set([
          ...(periode.du <= fin ? joursDeCoursEntre(classe.jours, periode.du, fin) : []),
          ...appels.map((a) => a.date),
        ]),
      ].sort();
      const parDate = new Map(appels.map((a) => [a.date, a]));
      const lignes = membres
        .filter((m) => m.actif || appels.some((a) => a.presences.has(m.id)))
        .map((membre): LigneRapport => {
          const statuts = dates.map((d) => parDate.get(d)?.presences.get(membre.id)?.statut ?? null);
          const faits = statuts.filter((s): s is StatutPresence => s !== null);
          return {
            membre,
            statuts,
            presences: faits.filter((s) => s === "present").length,
            absences: faits.filter((s) => s === "absent").length,
            taux: tauxPresence(faits),
          };
        });
      return {
        classe,
        dates,
        appelsFaits: new Set(appels.map((a) => a.date)),
        lignes,
        taux: tauxPresence(lignes.flatMap((l) => l.statuts.filter((s): s is StatutPresence => s !== null))),
      };
    }),
  );

  return {
    aujourdhui,
    periode,
    classeChoisie: choix.success && retenues.length ? choix.data : null,
    toutes: toutes.map((c) => ({ id: c.id, nom: c.nom })),
    classes,
  };
}

// ---------- Appel du jour (page « Ma classe ») ------------------------------

/** Classes ayant cours aujourd'hui, pour la carte « Appel du jour » ; vide sans droit d'appel. */
export async function chargerAppelDuJour(profil: Profil) {
  const vue = vueDuCompte(profil);
  if (!vue || !capacites(vue).appel) return [];
  const aujourdhui = aujourdhuiParis();
  const [classes, appels] = await Promise.all([listerClasses(), derniersAppels(aujourdhui)]);
  return classes
    .filter((c) => !c.archivee && aCoursLe(c.jours, aujourdhui))
    .map((c) => {
      const appel = appels.find((a) => a.classeId === c.id && a.date === aujourdhui);
      return {
        id: c.id,
        nom: c.nom,
        nbMembres: c.nbMembres,
        resume: appel ? resumeAppel(appel.statuts) : null,
      };
    });
}
