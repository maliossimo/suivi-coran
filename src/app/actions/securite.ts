"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import { exigerCodeAdmin } from "@/services/acces";
import {
  commencerAjoutAppareil,
  confirmerAppareil,
  retirerUnAppareil,
  verifierCodeConnexion,
} from "@/services/securite";
import type { EtatSaisie } from "./fiche";
import { notifier } from "./notification";

async function admin() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif || profil.role !== "admin") redirect("/");
  return profil;
}

/** Code saisi après le mot de passe : la session passe au niveau « double vérification ». */
export async function actionVerifierCode(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await admin();
  const r = await verifierCodeConnexion(profil, form.get("code"));
  if (!r.ok) return { erreur: r.erreur };
  redirect("/admin");
}

export type EtatAjout = EtatSaisie & { appareil?: { id: string; qr: string; cle: string } };

/** Étape 1 : QR code du nouvel appareil (si déjà vérifié, le code est exigé avant). */
export async function actionPreparerAppareil(_: EtatAjout, form: FormData): Promise<EtatAjout> {
  const profil = await admin();
  await exigerCodeAdmin(profil);
  const r = await commencerAjoutAppareil(profil, form.get("nom"));
  if (!r.ok)
    return { erreur: "La double vérification n’est pas disponible pour l’instant (réglage Supabase)." };
  return { appareil: { id: r.id, qr: r.qr, cle: r.cle } };
}

/** Étape 2 : le code affiché par l'appli confirme l'appareil. */
export async function actionConfirmerAppareil(etat: EtatAjout, form: FormData): Promise<EtatAjout> {
  const profil = await admin();
  const r = await confirmerAppareil(profil, form.get("id"), form.get("code"));
  if (!r.ok) return { ...etat, erreur: r.erreur };
  await notifier("Appareil enregistré : la double vérification est active");
  revalidatePath("/admin", "layout");
  redirect("/admin/securite");
}

export async function actionRetirerAppareil(form: FormData): Promise<void> {
  const profil = await admin();
  await exigerCodeAdmin(profil);
  const r = await retirerUnAppareil(profil, form.get("id"));
  await notifier(r.ok ? "Appareil retiré" : r.erreur, r.ok ? "succes" : "erreur");
  revalidatePath("/admin/securite");
}
