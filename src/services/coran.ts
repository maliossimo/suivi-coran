import "server-only";
import { z } from "zod";
import { BASMALA, aBasmala, juzDePage, type SegmentTajwid } from "@/domain/coran";
import { lireLecture, type Lecture } from "@/domain/lectures";
import type { Sourate } from "@/domain/versets";
import {
  correspondanceWarsh,
  dossierConnu,
  fichierEveryAyah,
  pagesMushaf,
  recitateurs,
  recitationsVersets,
  tajwidSourate,
  versetsSourate,
  type Recitation,
} from "@/repositories/coran";
import type { Profil } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";

/** Une sourate (ou la partie d'une sourate) affichée. */
export interface BlocCoran {
  sourate: number;
  nomAr: string;
  nomLatin: string;
  nbVersets: number;
  /** Le bloc commence au verset 1 : titre de la sourate (et basmala) affichés. */
  debut: boolean;
  basmala: string | null;
  versets: { n: number; texte: string; tajwid: SegmentTajwid[] | null }[];
}

export interface PageCoran {
  lecture: Lecture;
  vue: "sourate" | "page";
  sourates: Pick<Sourate, "numero" | "nomLatin" | "nomAr" | "nbVersets">[];
  /** Vue sourate : la sourate ouverte. */
  sourate: number;
  /** Vue page : page du mushaf (1 à 604) et son juz. */
  page: number;
  juz: number;
  debutsJuz: number[];
  blocs: BlocCoran[];
  /** Passage à mémoriser venu de l'adresse (ex. lien d'une séance) ; null sinon. */
  passage: { du: number; au: number } | null;
  /** Warsh : correspondance des fichiers audio (Hafs) pour les sourates affichées. */
  correspondance: Record<string, number[][]> | null;
  /** D'abord les récitations où le texte suit, puis l'écoute seule (vue sourate). */
  recitations: Recitation[];
  bibliothequeDisponible: boolean;
}

const schemaParametres = z.object({
  lecture: z.string().optional(),
  vue: z.enum(["sourate", "page"]).catch("sourate"),
  sourate: z.coerce.number().int().min(1).max(114).catch(1),
  page: z.coerce.number().int().min(1).max(604).catch(1),
  du: z.coerce.number().int().min(1).max(286).optional().catch(undefined),
  au: z.coerce.number().int().min(1).max(286).optional().catch(undefined),
});

async function bloc(lecture: Lecture, s: Sourate, debut: number, fin: number): Promise<BlocCoran> {
  const [versets, tajwid] = await Promise.all([
    versetsSourate(lecture, s.numero),
    lecture === "hafs" ? tajwidSourate(s.numero) : Promise.resolve(null),
  ]);
  const numeros = Array.from({ length: fin - debut + 1 }, (_, i) => debut + i);
  return {
    sourate: s.numero,
    nomAr: s.nomAr,
    nomLatin: s.nomLatin,
    nbVersets: s.nbVersets,
    debut: debut === 1,
    basmala: debut === 1 && aBasmala(s.numero) ? BASMALA[lecture] : null,
    versets: numeros.map((n) => ({ n, texte: versets[n - 1] ?? "", tajwid: tajwid?.[n - 1] ?? null })),
  };
}

/** Lecture du Coran : pour l'instant réservée à l'administrateur. */
export async function chargerPageCoran(
  acteur: Profil,
  parametres: Record<string, string | undefined>,
): Promise<PageCoran> {
  if (acteur.role !== "admin" || !acteur.actif) throw new Error("Réservé à l'administrateur.");
  const p = schemaParametres.parse(parametres);
  const lecture = lireLecture(p.lecture);
  const [sourates, mushaf, correspondance] = await Promise.all([
    listerSourates(lecture),
    pagesMushaf(lecture),
    lecture === "warsh" ? correspondanceWarsh() : Promise.resolve(null),
  ]);
  const parNumero = new Map(sourates.map((s) => [s.numero, s]));

  let blocs: BlocCoran[];
  let page: number;
  let passage: PageCoran["passage"] = null;
  if (p.vue === "page") {
    page = p.page;
    blocs = await Promise.all(
      mushaf.pages[page - 1]!.map(([s, debut, fin]) => bloc(lecture, parNumero.get(s)!, debut, fin)),
    );
  } else {
    const s = parNumero.get(p.sourate)!;
    blocs = [await bloc(lecture, s, 1, s.nbVersets)];
    page = mushaf.pages.findIndex((tranches) => tranches.some(([n]) => n === s.numero)) + 1;
    if (p.du !== undefined) {
      const du = Math.min(p.du, s.nbVersets);
      const au = Math.min(Math.max(p.au ?? du, du), s.nbVersets);
      passage = { du, au };
    }
  }

  const affichees = new Set(blocs.map((b) => b.sourate));
  const bibliotheque = p.vue === "sourate" ? await recitateurs(lecture).catch(() => null) : [];
  const sourateEntiere: Recitation[] = (bibliotheque ?? [])
    .filter((r) => r.sourates.includes(p.sourate))
    .map((r) => ({
      id: `mp3-${r.id}`,
      nom: r.nom,
      style: r.style,
      suivi: false,
      source: r.serveur,
      mots: null,
      dossier: null,
      alignement: null,
    }));

  return {
    lecture,
    vue: p.vue,
    sourates: sourates.map(({ numero, nomLatin, nomAr, nbVersets }) => ({
      numero,
      nomLatin,
      nomAr,
      nbVersets,
    })),
    sourate: p.vue === "sourate" ? p.sourate : blocs[0]!.sourate,
    page,
    juz: juzDePage(page, mushaf.juz),
    debutsJuz: mushaf.juz,
    blocs,
    passage,
    correspondance: correspondance
      ? Object.fromEntries(Object.entries(correspondance).filter(([s]) => affichees.has(Number(s))))
      : null,
    recitations: [...recitationsVersets(lecture), ...sourateEntiere],
    bibliothequeDisponible: bibliotheque !== null,
  };
}

const schemaFichier = z.object({
  dossier: z
    .string()
    .max(80)
    .regex(/^[\w./-]+$/),
  fichier: z.string().regex(/^\d{6}\.mp3$/),
});

/**
 * Téléchargement hors ligne d'un verset récité (admin) : le serveur va le chercher chez
 * EveryAyah (le navigateur ne peut pas le garder directement). Seuls les dossiers connus
 * sont acceptés : ce n'est pas un relais ouvert.
 */
export async function versetPourHorsLigne(
  acteur: Profil | null,
  parametres: Record<string, string | null>,
): Promise<Response> {
  if (!acteur || acteur.role !== "admin" || !acteur.actif) return new Response(null, { status: 403 });
  const p = schemaFichier.safeParse(parametres);
  if (!p.success || !dossierConnu(p.data.dossier)) return new Response(null, { status: 400 });
  const reponse = await fichierEveryAyah(p.data.dossier, p.data.fichier).catch(() => null);
  if (!reponse?.ok || !reponse.body) return new Response(null, { status: 502 });
  return new Response(reponse.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
