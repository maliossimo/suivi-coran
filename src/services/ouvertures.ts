import "server-only";
import { noterOuverture } from "@/repositories/ouvertures";
import { profilConnecte } from "@/repositories/profils";

/** Ouverture de l'appli (ou retour sur l'appli déjà connectée). */
export async function signalerOuverture(): Promise<void> {
  const profil = await profilConnecte();
  if (!profil?.actif) return;
  await noterOuverture().catch(() => undefined);
}
