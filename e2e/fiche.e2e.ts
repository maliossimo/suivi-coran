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
    // (Seulement l'envoi de la séance : d'autres envois discrets partent aussi à l'ouverture.)
    const envoi = page.waitForResponse(
      (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("dureeMin"),
      { timeout: 20_000 },
    );
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

    // La suppression est rangée dans le menu « ⋯ », qui reste dans l'écran.
    await page.locator('summary[aria-label="Plus d’actions"]').click();
    const supprimer = page.getByRole("button", { name: /Supprimer cette séance/ });
    await expect(supprimer).toBeVisible();
    const boite = await supprimer.boundingBox();
    const largeur = page.viewportSize()?.width ?? 0;
    expect(boite && boite.x >= 0 && boite.x + boite.width <= largeur).toBe(true);
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
    await recitation.getByRole("button", { name: "Tout à refaire" }).click();
    await expect(recitation.getByRole("radio", { name: /À refaire/ }).first()).toHaveAttribute(
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
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await cheikh.close();

    const eleve = await browser.newContext();
    const page2 = await eleve.newPage();
    await seConnecter(page2, COMPTES.eleveA, /\/eleve/);
    await page2.goto(`/eleve/seance?date=${jourParis(-1)}&type=revision`);
    await expect(page2.getByText("✓ Validé", { exact: true }).first()).toBeVisible();
    await expect(page2.getByText(/^validé le /).first()).toBeVisible();
    await capture(page2, "12-eleve-valide");

    // L'élève marque lui-même son passage chez le Cheikh : à refaire, puis validé.
    const passe = page2.getByRole("region", { name: "Passé avec le Cheikh" });
    await passe
      .getByRole("radio", { name: /À refaire/ })
      .first()
      .click();
    await expect(passe.getByRole("radio", { name: /À refaire/ }).first()).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page2.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await page2.reload();
    await expect(
      page2
        .getByRole("region", { name: "Passé avec le Cheikh" })
        .getByRole("radio", { name: /À refaire/ })
        .first(),
    ).toHaveAttribute("aria-checked", "true");
    await page2
      .getByRole("region", { name: "Passé avec le Cheikh" })
      .getByRole("radio", { name: /Validé/ })
      .first()
      .click();
    await capture(page2, "13-eleve-passe-cheikh");
    await eleve.close();
  });
});

test.describe("Mode révision", () => {
  test("l'onglet Révision fait passer toute l'appli à l'or, et Apprentissage la ramène au vert", async ({
    page,
  }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    // La fiche est affichée (pas l'écran de chargement) avant de lire la couleur de l'en-tête.
    await expect(page.locator(".onglets .onglet-revision")).toBeVisible();
    const barre = page.locator("header.barre").first();
    const fond = () => barre.evaluate((e) => getComputedStyle(e).backgroundColor);
    await expect.poll(fond).not.toBe("");
    const vert = await fond();
    await page.locator(".onglets .onglet-revision").click();
    await expect(page).toHaveURL(/type=revision/);
    await expect(page.locator(".mode-revision")).toHaveCount(1);
    await expect.poll(fond).not.toBe(vert);
    // La couleur donnée au toucher laisse la main à la page une fois la fiche affichée.
    await expect(page.locator("html")).not.toHaveAttribute("data-mode-force", /./);
    await expect(page.locator('.onglet-revision[aria-current="page"]')).toBeVisible();
    // Barre d'état du téléphone en or : notre balise est la première theme-color du document.
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("id", "theme-color-fiche");
    await page.locator(".onglets .onglet-apprentissage").click();
    await expect(page).toHaveURL(/type=apprentissage/);
    await expect(page.locator(".mode-revision")).toHaveCount(0);
    await expect.poll(fond).toBe(vert);
    await expect(page.locator("html")).not.toHaveAttribute("data-mode-force", /./);
    // La barre d'état du téléphone suit la fiche : la balise de la révision est retirée.
    await expect(page.locator("#theme-color-fiche")).toHaveCount(0);
  });
});

test.describe("Finitions de l'interface", () => {
  test("le jour s'ouvre en page, l'en-tête compact apparaît, la pastille du bas est en place", async ({
    page,
  }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    // Barre du bas : la pastille de l'onglet actif est posée.
    await expect(page.locator(".nav-espace.avec-pastille .nav-pastille")).toBeVisible();
    // En-tête compact : caché en haut de page, visible après défilement.
    await expect(page.locator(".barre-compacte[data-visible]")).toHaveCount(0);
    await page.mouse.wheel(0, 900);
    await expect(page.locator(".barre-compacte[data-visible]")).toBeVisible();
    await page.mouse.wheel(0, -2000);
    await expect(page.locator(".barre-compacte[data-visible]")).toHaveCount(0);
    // Un jour s'ouvre en page : le voile part une fois la séance affichée.
    // Un jour visible (les semaines passées sont repliées).
    await page.locator("a.jour[data-ouvre-en-page]:visible").first().click();
    await expect(page).toHaveURL(/\/eleve\/seance/);
    await expect(page.locator(".ouverture-page")).toHaveCount(0, { timeout: 4000 });
  });

  test("le choix du thème : le fond de l'option choisie glisse", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    await page.goto("/compte");
    const groupe = page.getByRole("radiogroup", { name: "Thème" });
    await expect(groupe).toHaveClass(/avec-indicateur/);
    const indicateur = groupe.locator(".indicateur-glissant");
    const avant = await indicateur.evaluate((e) => e.style.transform);
    await groupe.getByRole("radio", { name: "Sombre" }).click();
    await expect.poll(() => indicateur.evaluate((e) => e.style.transform)).not.toBe(avant);
    await groupe.getByRole("radio", { name: "Comme le téléphone" }).click();
  });
});
