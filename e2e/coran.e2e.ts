import { appuiLong, capture, COMPTES, expect, seConnecter, test } from "./outils";

test.describe("Coran (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
  });

  test("toucher un verset ouvre ses actions, sans faire défiler la page", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=18");
    await capture(page, "40-coran");
    const verset = page.locator('.coran-verset[data-cle="18:10"]');
    await verset.scrollIntoViewIfNeeded();
    const avant = await page.evaluate(() => window.scrollY);
    await verset.click();

    const feuille = page.getByRole("dialog", { name: "Verset 10" });
    await expect(feuille).toBeVisible();
    await expect(feuille.getByRole("button", { name: "Écouter d’ici" })).toBeVisible();
    // Au toucher, l'explication attend qu'on la demande.
    await expect(feuille.locator(".explication-verset")).toHaveCount(0);
    await feuille.getByRole("button", { name: "Explication" }).click();
    await expect(feuille.locator(".explication-verset")).toBeVisible();

    // La page derrière est figée ; la molette sur la feuille ne la fait pas défiler.
    expect(await page.evaluate(() => document.body.style.position)).toBe("fixed");
    await page.mouse.wheel(0, 800);
    await page.keyboard.press("Escape");
    await expect(feuille).toBeHidden();
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - avant)).toBeLessThan(2);
  });

  test("appui long sur un verset : son explication directement", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=18");
    // L'appli doit être prête (scripts chargés) avant le geste.
    await page.waitForLoadState("networkidle");
    const verset = page.locator('.coran-verset[data-cle="18:10"]');
    await verset.scrollIntoViewIfNeeded();
    // Au milieu d'un mot du verset (un verset peut s'étaler sur plusieurs lignes).
    await appuiLong(page, verset.locator(".mot").nth(1));

    const feuille = page.getByRole("dialog", { name: "Verset 10" });
    await expect(feuille).toBeVisible();
    // Le doigt relevé sur le voile ne referme pas la feuille.
    await page.waitForTimeout(300);
    await expect(feuille).toBeVisible();
    // Explication chargée (ou message clair si la source est injoignable).
    await expect(
      feuille.locator(".explication-texte, .explication-verset .carte-graphique-sous").first(),
    ).toBeVisible({ timeout: 20_000 });
    await capture(page, "41-verset-explication");
    // Visible dans le journal du CI : explication réellement reçue de la source ?
    console.log(`Explication : ${(await feuille.locator(".explication-verset").innerText()).slice(0, 300)}`);
  });

  test("marque-page : ajouté depuis le verset, retrouvé dans « Aller à »", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=36");
    await page.locator('.coran-verset[data-cle="36:12"]').click();
    const feuille = page.getByRole("dialog", { name: "Verset 12" });
    await feuille.getByRole("button", { name: "Marque-page" }).click();
    await expect(feuille.getByRole("button", { name: "Marqué" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('.coran-verset[data-cle="36:12"]')).toHaveClass(/marque/);

    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.locator(".coran-aller").click();
    const aller = page.getByRole("dialog", { name: "Aller à" });
    await aller.getByRole("tab", { name: "Marques" }).click();
    await capture(page, "44-marque-pages");
    await aller.getByRole("button", { name: /verset 12/ }).click();
    await expect(page).toHaveURL(/sourate=36#verset-36-12/, { timeout: 15_000 });
  });

  test("minuterie et couleurs sépia", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.getByRole("button", { name: "Réglages" }).click();
    const reglages = page.getByRole("dialog", { name: "Réglages" });
    await reglages
      .getByRole("group", { name: "Arrêter l’écoute" })
      .getByRole("button", { name: "15 min" })
      .click();
    await reglages
      .getByRole("group", { name: "Couleurs de la page" })
      .getByRole("button", { name: "Sépia" })
      .click();
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Arrêt dans 1[45]:/)).toBeVisible();
    await expect(page.locator("article.coran-page")).toHaveClass(/theme-sepia/);
    await capture(page, "45-sepia-minuterie");
  });

  test("me réciter : enregistrer puis comparer (micro simulé)", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=112");
    await page.locator('.coran-verset[data-cle="112:1"]').click();
    const feuille = page.getByRole("dialog", { name: "Verset 1" });
    await feuille.getByRole("button", { name: "M’enregistrer" }).click();
    await expect(feuille.getByRole("button", { name: /Arrêter · / })).toBeVisible();
    await page.waitForTimeout(1500);
    await feuille.getByRole("button", { name: /Arrêter · / }).click();
    await expect(feuille.getByRole("button", { name: "Comparer" })).toBeVisible();
    await expect(feuille.getByRole("button", { name: "Écouter ma voix" })).toBeVisible();
    await capture(page, "46-me-reciter");
  });

  test("« Aller à » trouve une sourate par son nom", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.locator(".coran-aller").click();
    const feuille = page.getByRole("dialog", { name: "Aller à" });
    await feuille.getByRole("searchbox", { name: "Chercher une sourate" }).fill("kahf");
    await capture(page, "42-aller-a");
    await feuille
      .getByRole("button", { name: /Al-Kahf/ })
      .first()
      .click();
    // Première ouverture d’une grande sourate après le démarrage du serveur : on laisse le temps.
    await expect(page).toHaveURL(/sourate=18/, { timeout: 15_000 });
  });

  test("récitateur favori : l'étoile le met en tête de liste", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.getByRole("button", { name: "Réglages" }).click();
    const reglages = page.getByRole("dialog", { name: "Réglages" });
    await reglages.getByRole("button", { name: /^Récitateur :/ }).click();
    const liste = page.getByRole("dialog", { name: "Récitateur" });
    const etoiles = liste.getByRole("button", { name: /^Ajouter .* aux favoris$/ });
    const nom = ((await etoiles.nth(2).getAttribute("aria-label")) ?? "").replace(
      /^Ajouter | aux favoris$/g,
      "",
    );
    await etoiles.nth(2).click();
    await expect(
      liste.getByRole("listbox", { name: "Favoris" }).getByText(nom, { exact: true }),
    ).toBeVisible();
    await capture(page, "43-favoris");
  });
});
