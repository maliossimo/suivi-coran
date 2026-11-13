import { expect, test } from "@playwright/test";
import { COMPTES, IDS, MOT_DE_PASSE, capture, seConnecter } from "./outils";

test.describe("Connexion et droits", () => {
  test("un mauvais mot de passe est refusé", async ({ page }) => {
    await page.goto("/connexion");
    await capture(page, "01-connexion");
    await page.getByLabel("Adresse e-mail").fill(COMPTES.eleveA);
    await page.getByLabel("Mot de passe").fill(`${MOT_DE_PASSE}-faux`);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Adresse e-mail ou mot de passe incorrect.")).toBeVisible();
  });

  test("chaque rôle arrive sur son accueil", async ({ browser }) => {
    for (const [email, arrivee] of [
      [COMPTES.eleveA, /\/eleve/],
      [COMPTES.cheikhA, /\/maitre/],
      [COMPTES.admin, /\/admin/],
    ] as const) {
      const contexte = await browser.newContext();
      const page = await contexte.newPage();
      await seConnecter(page, email, arrivee);
      await contexte.close();
    }
  });

  test("l'élève n'ouvre ni l'espace du Cheikh, ni l'administration, ni les présences", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    for (const interdit of ["/maitre", "/admin", "/presences", "/admin/coran"]) {
      await page.goto(interdit);
      await expect(page, `${interdit} doit renvoyer l'élève chez lui`).toHaveURL(/\/eleve/);
    }
  });

  test("un Cheikh ne voit pas l'élève d'une autre mosquée", async ({ page }) => {
    await seConnecter(page, COMPTES.cheikhB, /\/maitre/);
    await expect(page.getByText("Inès")).toHaveCount(0);
    // Page en streaming (loading.tsx) : le statut reste 200, c'est le contenu qui compte.
    await page.goto(`/maitre/eleves/${IDS.eleveA}`);
    await expect(page.getByText(/404|introuvable|could not be found/i).first()).toBeVisible();
    await expect(page.getByText("Inès")).toHaveCount(0);
    await capture(page, "02-cheikh-autre-mosquee");
  });

  test("le Cheikh n'a pas encore les présences (réservées à l'admin)", async ({ page }) => {
    await seConnecter(page, COMPTES.cheikhA, /\/maitre/);
    await page.goto("/presences");
    await expect(page).toHaveURL(/\/maitre/);
  });
});
