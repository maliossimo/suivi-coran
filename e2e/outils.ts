import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * `test` du projet : en cas d'échec, le journal du CI montre aussi les erreurs
 * de la page (console et exceptions), pour comprendre sans les traces.
 */
export const test = base.extend<{ journal: void }>({
  journal: [
    async ({ page }, use, info) => {
      const lignes: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") lignes.push(`[console.${m.type()}] ${m.text()}`);
      });
      page.on("pageerror", (e) => lignes.push(`[exception] ${e.message}`));
      page.on("request", (r) => {
        if (r.url().includes("_rsc") || r.isNavigationRequest())
          lignes.push(`[requête] ${r.method()} ${r.url()} ${r.isNavigationRequest() ? "(navigation)" : ""}`);
      });
      page.on("response", (r) => {
        if (r.url().includes("_rsc")) lignes.push(`[réponse] ${r.status()} ${r.url()}`);
      });
      page.on("requestfailed", (r) =>
        lignes.push(`[requête échouée] ${r.method()} ${r.url()} ${r.failure()?.errorText}`),
      );
      await use();
      if (info.status !== info.expectedStatus && lignes.length) {
        console.log(`--- Journal de la page (${info.title}) ---\n${lignes.join("\n")}`);
      }
    },
    { auto: true },
  ],
});
export { expect };

/** Appui long au doigt (vrais évènements tactiles), au centre de l'élément. */
export async function appuiLong(page: Page, cible: Locator, duree = 800): Promise<void> {
  const boite = await cible.boundingBox();
  if (!boite) throw new Error("Élément invisible");
  const point = { x: Math.round(boite.x + boite.width / 2), y: Math.round(boite.y + boite.height / 2) };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await page.waitForTimeout(duree);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Mot de passe des comptes fictifs (voir e2e/donnees.sql). */
export const MOT_DE_PASSE = "Essai-bout-en-bout-2026";

export const COMPTES = {
  admin: "admin@bout-en-bout.test",
  cheikhA: "cheikh.a@bout-en-bout.test",
  cheikhA2: "cheikh.a2@bout-en-bout.test",
  cheikhB: "cheikh.b@bout-en-bout.test",
  eleveA: "eleve.a@bout-en-bout.test",
  eleveB: "eleve.b@bout-en-bout.test",
} as const;

export const IDS = {
  eleveA: "e2e00000-0000-0000-0000-0000000000e1",
  eleveSoir: "e2e00000-0000-0000-0000-0000000000e3",
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
