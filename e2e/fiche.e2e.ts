import { expect, test } from "@playwright/test";
import { COMPTES, IDS, capture, jourParis, seConnecter } from "./outils";

test.describe("Fiche : l'élève saisit, le Cheikh corrige", () => {
  test("l'élève enregistre sa séance du jour", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    await capture(page, "10-eleve-fiche");
    const seance = `/eleve/seance?date=${jourParis()}&type=apprentissage`;
    await page.goto(seance);
    const enregistrer = page.getByRole("button", { name: "Enregistrer la séance" });
    await expect(enregistrer).toBeEnabled();
    await page.getByRole("button", { name: "15 min", exact: true }).click();
    await capture(page, "11-eleve-seance");
    await enregistrer.click();
    await expect(page).toHaveURL(/\/eleve(\?|$)/);

    // La séance est bien en base : rouverte, elle affiche 15 minutes.
    await expect
      .poll(
        async () => {
          await page.goto(seance);
          return page.locator("#dureeMin").inputValue();
        },
        { timeout: 20_000 },
      )
      .toBe("15");
  });

  test("le Cheikh voit sa classe et corrige la séance d'hier", async ({ page }) => {
    await seConnecter(page, COMPTES.cheikhA, /\/maitre/);
    await expect(page.getByText("Inès").first()).toBeVisible();
    await expect(page.getByText("Bilal")).toHaveCount(0);
    await capture(page, "20-cheikh-classe");

    await page.goto(`/maitre/eleves/${IDS.eleveA}`);
    await capture(page, "21-cheikh-fiche-eleve");

    await page.goto(`/maitre/eleves/${IDS.eleveA}/seance?date=${jourParis(-1)}&type=revision`);
    // Vue du Cheikh épurée : pas de lien vers le Coran.
    await expect(page.getByText("Écouter dans le Coran")).toHaveCount(0);
    await capture(page, "22-cheikh-correction");
    const corriger = page.getByRole("button", { name: "Enregistrer la correction" });
    await expect(corriger).toBeEnabled();
    await corriger.click();
    await expect(page).toHaveURL(new RegExp(`/maitre/eleves/${IDS.eleveA}(\\?|$)`));
  });
});
