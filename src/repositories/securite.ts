import "server-only";
import { clientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/server";

/** Mot de passe erroné : noté par le serveur (clé de service), 100 au plus par heure pour tout le site. */
export async function noterEchecConnexion(email: string, libelle: string): Promise<void> {
  const admin = clientAdmin();
  if (!admin) return;
  const depuis = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from("evenements_securite")
    .select("id", { count: "exact", head: true })
    .eq("type", "echec_connexion")
    .gte("cree_le", depuis);
  if ((count ?? 0) >= 100) return;
  await admin
    .from("evenements_securite")
    .insert({ type: "echec_connexion", email: email.slice(0, 120), libelle: libelle.slice(0, 80) });
}

/** La personne connectée signale son appareil ; true si c'est un nouvel appareil (pas le premier). */
export async function noterAppareil(appareil: string, libelle: string): Promise<boolean> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("noter_appareil", { p_appareil: appareil, p_libelle: libelle });
  if (error) return false;
  return data === true;
}

export interface EvenementSecurite {
  id: string;
  type: "nouvel_appareil" | "echec_connexion";
  personneId: string | null;
  email: string | null;
  libelle: string;
  quand: string;
}

/** Pour l'admin : les derniers événements de sécurité (30 jours). */
export async function listerEvenementsSecurite(): Promise<EvenementSecurite[]> {
  const supabase = await creerClientServeur();
  const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("evenements_securite")
    .select("id, type, personne_id, email, libelle, cree_le")
    .gte("cree_le", depuis)
    .order("cree_le", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Lecture des événements impossible : ${error.message}`);
  return (data ?? []).map((e) => ({
    id: e.id as string,
    type: e.type as EvenementSecurite["type"],
    personneId: (e.personne_id as string | null) ?? null,
    email: (e.email as string | null) ?? null,
    libelle: (e.libelle as string) ?? "",
    quand: e.cree_le as string,
  }));
}

/** Une mesure de vitesse réelle (anonyme). */
export async function noterVitesse(page: string, metrique: string, valeur: number, mobile: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase.rpc("noter_vitesse", { p_page: page, p_metrique: metrique, p_valeur: valeur, p_mobile: mobile });
}

export interface MesureVitesse {
  page: string;
  metrique: string;
  valeur: number;
  mobile: boolean;
  quand: string;
}

/** Pour l'admin : les mesures des 7 derniers jours (5 000 au plus). */
export async function listerMesuresVitesse(): Promise<MesureVitesse[]> {
  const supabase = await creerClientServeur();
  const depuis = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("mesures_vitesse")
    .select("page, metrique, valeur, mobile, cree_le")
    .gte("cree_le", depuis)
    .order("cree_le", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`Lecture des mesures impossible : ${error.message}`);
  return (data ?? []).map((m) => ({
    page: m.page as string,
    metrique: m.metrique as string,
    valeur: Number(m.valeur),
    mobile: Boolean(m.mobile),
    quand: m.cree_le as string,
  }));
}
