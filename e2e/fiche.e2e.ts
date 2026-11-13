import { capture, COMPTES, expect, IDS, jourParis, seConnecter, test } from "./outils";

test.describe("Fiche : l'élève saisit, le Cheikh corrige", () => {
  test("l'élève enregistre sa séance du jour", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    await capture(page, "10-eleve-fiche");
    const seance = `/eleve/seance?date=${jourParis()}&type=apprentissage`;
    await page.goto(seance);
    const enregistrer = page.getByRole("button", { name: "Enregistrer", exact: true });
    await expect(enregistrer).toBeEnabled();
    await page.getByRole("button", { name: "15 min", exact: true }).click();
    await capture(page, "11-eleve-seance");
    // L'envoi part en arrière-plan : on attend la réponse du serveur avant de recharger
    // (un rechargement couperait l'envoi ; dans l'appli, il reprendrait au retour).
    const envoi = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 20_000 });
    await enregistrer.click();
    await expect(page).toHaveURL(/\/eleve(\?|$)/);
    await envoi;

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
    // La saisie de l'élève est résumée : on la déplie pour la corriger.
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    const corriger = page.getByRole("button", { name: "Enregistrer la correction" });
    await expect(corriger).toBeEnabled();
    await corriger.click();
    await expect(page).toHaveURL(new RegExp(`/maitre/eleves/${IDS.eleveA}(\\?|$)`));
  });

  test("le Cheikh écoute puis valide un passage, l'élève le voit", async ({ browser }) => {
    const cheikh = await browser.newContext();
    const page = await cheikh.newPage();
    await seConnecter(page, COMPTES.cheikhA, /\/maitre/);
    await page.goto(`/maitre/eleves/${IDS.eleveA}/seance?date=${jourParis(-1)}&type=revision`);
    const recitation = page.getByRole("region", { name: "Écoute du Cheikh" });
    await recitation.getByRole("button", { name: "Tout écouté" }).click();
    await expect(recitation.getByRole("radio", { name: /Écouté/ }).first()).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await recitation
      .getByRole("radio", { name: /Validé/ })
      .first()
      .click();
    await expect(recitation.getByRole("radio", { name: /Validé/ }).first()).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await capture(page, "23-cheikh-valide");
    await page.waitForLoadState("networkidle");
    await cheikh.close();

    const eleve = await browser.newContext();
    const page2 = await eleve.newPage();
    await seConnecter(page2, COMPTES.eleveA, /\/eleve/);
    await page2.goto(`/eleve/seance?date=${jourParis(-1)}&type=revision`);
    await expect(page2.getByText("✓ Validé", { exact: true }).first()).toBeVisible();
    await expect(page2.getByText(/^validé le /).first()).toBeVisible();
    await capture(page2, "12-eleve-valide");
    await eleve.close();
  });
});
