import "server-only";
import { z } from "zod";
import { HEURES_ENTRE_DEUX_ESSAIS, type HorairesMawaqit } from "@/domain/mawaqit";
import { clientAdmin } from "@/lib/supabase/admin";

/**
 * Mise à jour automatique des horaires des mosquées (tâche serveur, sans utilisateur connecté) :
 * seul usage du client « service role » hors invitations. N'écrit que les horaires de prière
 * et le suivi de l'import, jamais le suivi pédagogique.
 */

const schemaMosquee = z.object({
  id: z.string().uuid(),
  mawaqit: z.string().regex(/^[a-z0-9-]{1,160}$/),
  mawaqit_importe_le: z.string().nullable(),
  mawaqit_tente_le: z.string().nullable(),
});

export interface MosqueeMawaqit {
  id: string;
  adresse: string;
  importeLe: Date | null;
  tenteLe: Date | null;
}

function client() {
  const c = clientAdmin();
  if (!c) throw new Error("SUPABASE_SERVICE_ROLE_KEY absente : import Mawaqit impossible");
  return c;
}

/** Les établissements reliés à une page Mawaqit. */
export async function mosqueesMawaqit(): Promise<MosqueeMawaqit[]> {
  const { data, error } = await client()
    .from("etablissements")
    .select("id, mawaqit, mawaqit_importe_le, mawaqit_tente_le")
    .not("mawaqit", "is", null);
  if (error) throw new Error(`Lecture des établissements : ${error.message}`);
  return z
    .array(schemaMosquee)
    .parse(data)
    .map((m) => ({
      id: m.id,
      adresse: m.mawaqit,
      importeLe: m.mawaqit_importe_le ? new Date(m.mawaqit_importe_le) : null,
      tenteLe: m.mawaqit_tente_le ? new Date(m.mawaqit_tente_le) : null,
    }));
}

/**
 * Enregistre le calendrier (un upsert par jour, en une requête : tout ou rien), puis Joumou'a et la date.
 * Le 29 février reste d'une année à l'autre s'il manque (calendrier d'une année type).
 */
export async function enregistrerHorairesMawaqit(etablissementId: string, h: HorairesMawaqit): Promise<void> {
  const c = client();
  const maintenant = new Date().toISOString();
  const { error } = await c.from("horaires_priere").upsert(
    h.jours.map((j) => ({
      etablissement_id: etablissementId,
      mois: j.mois,
      jour: j.jour,
      fajr: j.fajr,
      chourouq: j.chourouq,
      dhuhr: j.dhuhr,
      asr: j.asr,
      maghrib: j.maghrib,
      isha: j.isha,
      iqama_fajr: j.iqamaFajr,
      iqama_dhuhr: j.iqamaDhuhr,
      iqama_asr: j.iqamaAsr,
      iqama_maghrib: j.iqamaMaghrib,
      iqama_isha: j.iqamaIsha,
      importe_le: maintenant,
    })),
    { onConflict: "etablissement_id,mois,jour" },
  );
  if (error) throw new Error(`Enregistrement des horaires : ${error.message}`);
  const { error: e2 } = await c
    .from("etablissements")
    .update({ jumua: h.jumua.length ? h.jumua : null, mawaqit_importe_le: maintenant, mawaqit_erreur: null })
    .eq("id", etablissementId);
  if (e2) throw new Error(`Suivi de l'import : ${e2.message}`);
}

/** Note l'essai avant d'appeler Mawaqit : deux appels simultanés n'en feront qu'un par jour. */
export async function noterEssaiMawaqit(etablissementId: string, quand: Date): Promise<boolean> {
  const limite = new Date(quand.getTime() - HEURES_ENTRE_DEUX_ESSAIS * 3_600_000).toISOString();
  const { data, error } = await client()
    .from("etablissements")
    .update({ mawaqit_tente_le: quand.toISOString() })
    .eq("id", etablissementId)
    .or(`mawaqit_tente_le.is.null,mawaqit_tente_le.lt."${limite}"`)
    .select("id");
  if (error) throw new Error(`Suivi de l'import : ${error.message}`);
  return (data ?? []).length === 1;
}

/** Garde la trace d'un échec (les horaires déjà en base restent utilisés). */
export async function noterErreurMawaqit(etablissementId: string, message: string): Promise<void> {
  await client()
    .from("etablissements")
    .update({ mawaqit_erreur: message.slice(0, 300) })
    .eq("id", etablissementId);
}
