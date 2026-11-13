import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import type { Profil } from "@/repositories/profils";

/** L'admin regarde l'espace d'un Cheikh en lecture seule (par défaut) ou peut modifier comme lui. */
export type ModeVueAdmin = "lecture" | "modification";

const COOKIE = "vue-admin";
const schemaMode = z.enum(["lecture", "modification"]);

export async function modeVueAdmin(): Promise<ModeVueAdmin> {
  return schemaMode.catch("lecture").parse((await cookies()).get(COOKIE)?.value);
}

export async function choisirModeVueAdmin(acteur: Profil, modeBrut: unknown): Promise<void> {
  if (acteur.role !== "admin" || !acteur.actif) return;
  const mode = schemaMode.catch("lecture").parse(modeBrut);
  (await cookies()).set(COOKIE, mode, {
    path: "/",
    // Le mode modification ne dure que la journée : on revient ensuite à la lecture seule.
    maxAge: mode === "modification" ? 60 * 60 * 12 : 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}
