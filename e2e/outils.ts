import { expect, type Page } from "@playwright/test";

/** Mot de passe des comptes fictifs (voir e2e/donnees.sql). */
export const MOT_DE_PASSE = "Essai-bout-en-bout-2026";

export const COMPTES = {
  admin: "admin@bout-en-bout.test",
  cheikhA: "cheikh.a@bout-en-bout.test",
  cheikhB: "cheikh.b@bout-en-bout.test",
  eleveA: "eleve.a@bout-en-bout.test",
  eleveB: "eleve.b@bout-en-bout.test",
} as const;

export const IDS = {
  eleveA: "e2e00000-0000-0000-0000-0000000000e1",
  classe: "e2e00000-0000-0000-0000-0000000c1a55",
} as const;

/** Date du jour à Paris, décalée de `decalage` jours (« 2026-11-13 »). */
export function jourParis(decalage = 0): string {
  const d = new Date(Date.now() + decalage * 86_400_000);
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);
}

export async function seConnecter(page: Page, email: string, arrivee: RegExp): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(arrivee, { timeout: 20_000 });
}

/** Capture d'écran pleine page, rangée dans les résultats du test. */
export async function capture(page: Page, nom: string): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.screenshot({ path: `e2e/resultats/captures/${nom}.png`, fullPage: true });
}
