import "server-only";
import { z } from "zod";
import type { DateISO } from "@/domain/calendrier";
import type { StatutPresence } from "@/domain/presences";
import { creerClientServeur } from "@/lib/supabase/server";

/*
 * Présences : classes, élèves des classes et appels. Les droits sont appliqués par la base
 * (peut_voir_classe / peut_gerer_classe) : ici, on lit et on écrit simplement.
 */

export interface Classe {
  id: string;
  etablissementId: string;
  nom: string;
  jours: number[];
  archivee: boolean;
  cheikhs: { id: string; nom: string }[];
  nbMembres: number;
}

export interface MembreClasse {
  id: string;
  eleveId: string | null;
  prenom: string;
  nom: string;
  actif: boolean;
  /** Vrai : élève avec un compte dans l'appli. */
  avecCompte: boolean;
}

export interface Appel {
  id: string;
  date: DateISO;
  faitLe: string;
  presences: Map<string, { statut: StatutPresence; note: string | null }>;
}

const nomComplet = (p: { prenom: string | null; nom: string | null } | null) =>
  `${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim() || "Sans nom";

const schemaStatut = z.enum(["present", "absent", "retard", "excuse"]);
const schemaPersonne = z.object({ prenom: z.string().nullable(), nom: z.string().nullable() }).nullable();

const schemaClasse = z.object({
  id: z.string().uuid(),
  etablissement_id: z.string().uuid(),
  nom: z.string(),
  jours: z.array(z.number().int()),
  archivee: z.boolean(),
  classes_cheikhs: z.array(z.object({ maitre_id: z.string().uuid(), profils: schemaPersonne })),
  membres_classe: z.array(z.object({ count: z.number() })),
});

const CHAMPS_CLASSE =
  "id, etablissement_id, nom, jours, archivee, classes_cheikhs(maitre_id, profils(prenom, nom)), membres_classe(count)";

function versClasse(c: z.infer<typeof schemaClasse>): Classe {
  return {
    id: c.id,
    etablissementId: c.etablissement_id,
    nom: c.nom,
    jours: [...c.jours].sort((a, b) => a - b),
    archivee: c.archivee,
    cheikhs: c.classes_cheikhs.map((cc) => ({ id: cc.maitre_id, nom: nomComplet(cc.profils) })),
    nbMembres: c.membres_classe[0]?.count ?? 0,
  };
}

/** Classes visibles par la personne connectée. */
export async function listerClasses(): Promise<Classe[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("classes")
    .select(CHAMPS_CLASSE)
    .eq("membres_classe.actif", true)
    .order("nom");
  if (error) throw new Error(`Lecture des classes impossible : ${error.message}`);
  return z.array(schemaClasse).parse(data).map(versClasse);
}

export async function lireClasse(id: string): Promise<Classe | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("classes")
    .select(CHAMPS_CLASSE)
    .eq("id", id)
    .eq("membres_classe.actif", true)
    .maybeSingle();
  if (error) throw new Error(`Lecture de la classe impossible : ${error.message}`);
  return data ? versClasse(schemaClasse.parse(data)) : null;
}

/** Élèves de la classe (anciens compris), par ordre alphabétique. */
export async function membresClasse(classeId: string): Promise<MembreClasse[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("membres_classe")
    .select("id, eleve_id, prenom, nom, actif, profils(prenom, nom)")
    .eq("classe_id", classeId);
  if (error) throw new Error(`Lecture des élèves de la classe impossible : ${error.message}`);
  return z
    .array(
      z.object({
        id: z.string().uuid(),
        eleve_id: z.string().uuid().nullable(),
        prenom: z.string().nullable(),
        nom: z.string().nullable(),
        actif: z.boolean(),
        profils: schemaPersonne,
      }),
    )
    .parse(data)
    .map((m) => ({
      id: m.id,
      eleveId: m.eleve_id,
      prenom: (m.eleve_id ? m.profils?.prenom : m.prenom) ?? "",
      nom: (m.eleve_id ? m.profils?.nom : m.nom) ?? "",
      actif: m.actif,
      avecCompte: m.eleve_id !== null,
    }))
    .sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr"));
}

/** Appels d'une classe entre deux dates (incluses), du plus ancien au plus récent. */
export async function appelsEntre(classeId: string, du: DateISO, au: DateISO): Promise<Appel[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("appels")
    .select("id, date, fait_le, presences(membre_id, statut, note)")
    .eq("classe_id", classeId)
    .gte("date", du)
    .lte("date", au)
    .order("date");
  if (error) throw new Error(`Lecture des appels impossible : ${error.message}`);
  return z
    .array(
      z.object({
        id: z.string().uuid(),
        date: z.string(),
        fait_le: z.string(),
        presences: z.array(
          z.object({ membre_id: z.string().uuid(), statut: schemaStatut, note: z.string().nullable() }),
        ),
      }),
    )
    .parse(data)
    .map((a) => ({
      id: a.id,
      date: a.date,
      faitLe: a.fait_le,
      presences: new Map(a.presences.map((p) => [p.membre_id, { statut: p.statut, note: p.note }])),
    }));
}

/** Derniers appels faits (toutes classes visibles), pour l'accueil. */
export async function derniersAppels(
  depuis: DateISO,
): Promise<{ classeId: string; date: DateISO; statuts: StatutPresence[] }[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("appels")
    .select("classe_id, date, presences(statut)")
    .gte("date", depuis)
    .order("date", { ascending: false });
  if (error) throw new Error(`Lecture des appels impossible : ${error.message}`);
  return z
    .array(
      z.object({
        classe_id: z.string().uuid(),
        date: z.string(),
        presences: z.array(z.object({ statut: schemaStatut })),
      }),
    )
    .parse(data)
    .map((a) => ({ classeId: a.classe_id, date: a.date, statuts: a.presences.map((p) => p.statut) }));
}

export async function creerClasse(c: {
  etablissementId: string;
  nom: string;
  jours: number[];
  cheikhs: string[];
}): Promise<string> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("classes")
    .insert({ etablissement_id: c.etablissementId, nom: c.nom, jours: c.jours })
    .select("id")
    .single();
  if (error) throw new Error(`Création de la classe impossible : ${error.message}`);
  const id = z.object({ id: z.string().uuid() }).parse(data).id;
  if (c.cheikhs.length) await definirCheikhs(id, c.cheikhs);
  return id;
}

export async function modifierClasse(
  id: string,
  c: { nom: string; jours: number[]; archivee: boolean },
): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("classes").update(c).eq("id", id);
  if (error) throw new Error(`Modification de la classe impossible : ${error.message}`);
}

/** Remplace les Cheikhs d'une classe. */
export async function definirCheikhs(classeId: string, maitres: string[]): Promise<void> {
  const supabase = await creerClientServeur();
  const { error: e1 } = await supabase.from("classes_cheikhs").delete().eq("classe_id", classeId);
  if (e1) throw new Error(`Modification des Cheikhs impossible : ${e1.message}`);
  if (!maitres.length) return;
  const { error } = await supabase
    .from("classes_cheikhs")
    .insert(maitres.map((maitre_id) => ({ classe_id: classeId, maitre_id })));
  if (error) throw new Error(`Modification des Cheikhs impossible : ${error.message}`);
}

export async function ajouterMembre(
  classeId: string,
  membre: { eleveId: string } | { prenom: string; nom: string },
): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } =
    "eleveId" in membre
      ? await supabase
          .from("membres_classe")
          .upsert(
            { classe_id: classeId, eleve_id: membre.eleveId, actif: true },
            { onConflict: "classe_id,eleve_id" },
          )
      : await supabase
          .from("membres_classe")
          .insert({ classe_id: classeId, prenom: membre.prenom, nom: membre.nom || null });
  if (error) throw new Error(`Ajout de l'élève impossible : ${error.message}`);
}

/** Retire un élève de la classe (son historique de présences est gardé). */
export async function changerMembreActif(membreId: string, actif: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("membres_classe").update({ actif }).eq("id", membreId);
  if (error) throw new Error(`Modification de l'élève impossible : ${error.message}`);
}

export async function enregistrerAppel(
  classeId: string,
  date: DateISO,
  presences: { membre: string; statut: StatutPresence; note: string | null }[],
): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("enregistrer_appel", {
    p_classe: classeId,
    p_date: date,
    p_presences: presences.filter((p) => p.statut !== "present" || p.note),
  });
  if (error) throw new Error(`Enregistrement de l'appel impossible : ${error.message}`);
}

/** Élèves (avec compte) et Cheikhs d'un établissement, pour composer une classe. */
export async function personnesEtablissement(
  etablissementId: string,
): Promise<{ eleves: { id: string; nom: string }[]; maitres: { id: string; nom: string }[] }> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, prenom, nom, role")
    .eq("etablissement_id", etablissementId)
    .eq("actif", true)
    .in("role", ["eleve", "maitre"])
    .order("prenom");
  if (error) throw new Error(`Lecture de l'établissement impossible : ${error.message}`);
  const lignes = z
    .array(
      z.object({
        id: z.string().uuid(),
        prenom: z.string().nullable(),
        nom: z.string().nullable(),
        role: z.string(),
      }),
    )
    .parse(data);
  const versPersonne = (p: (typeof lignes)[number]) => ({ id: p.id, nom: nomComplet(p) });
  return {
    eleves: lignes.filter((p) => p.role === "eleve").map(versPersonne),
    maitres: lignes.filter((p) => p.role === "maitre").map(versPersonne),
  };
}
