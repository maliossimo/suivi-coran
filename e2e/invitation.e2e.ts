import { COMPTES, expect, MOT_DE_PASSE, seConnecter, test } from "./outils";

/**
 * Parcours complet du QR code : le Cheikh affiche le code de sa classe (en grand aussi),
 * un nouvel élève l'ouvre, crée son compte, et apparaît aussitôt dans la classe du Cheikh.
 * Classe du soir (Cheikh A2) : les autres tests comptent les élèves de la classe du Cheikh A.
 */
test.describe("Invitation par QR code", () => {
  test("le Cheikh montre le QR, l'élève s'inscrit et rejoint sa classe", async ({ page, browser }) => {
    await seConnecter(page, COMPTES.cheikhA2, /\/maitre/);
    await page.goto("/maitre/inviter");

    // Un code est affiché (créé au besoin).
    const creer = page.getByRole("button", { name: "Afficher le QR code de la classe" });
    if (await creer.isVisible()) await creer.click();
    const zone = page.locator(".qr-zone");
    await expect(zone).toBeVisible({ timeout: 20_000 });

    // En grand : plein écran avec le nom de la classe, puis fermeture.
    await zone.getByRole("button", { name: "Afficher en grand" }).click();
    const plein = page.getByRole("dialog", { name: /QR code de la classe/ });
    await expect(plein).toBeVisible();
    await expect(plein.getByText("Coran du soir (test)")).toBeVisible();
    await plein.getByRole("button", { name: "Fermer" }).click();
    await expect(plein).toBeHidden();

    // Le lien du code, ouvert par un téléphone sans compte (même site que les tests).
    const lien = await zone.getAttribute("data-lien");
    const chemin = new URL(lien ?? "").pathname;
    expect(chemin).toMatch(/^\/rejoindre\/.+/);

    const prenom = `Nour${Date.now().toString(36)}`;
    const eleve = await browser.newContext({ baseURL: new URL(page.url()).origin, locale: "fr-FR" });
    const tel = await eleve.newPage();
    await tel.goto(chemin);
    await tel.getByLabel("Prénom").fill(prenom);
    await tel.getByLabel("Nom", { exact: true }).fill("Essai");
    // Adresse fictive, unique à chaque passage (le test peut être relancé).
    await tel.getByLabel("Adresse e-mail").fill(`${prenom.toLowerCase()}@bout-en-bout.test`);
    await tel.getByLabel("Mot de passe (10 caractères minimum)").fill(MOT_DE_PASSE);
    await tel.getByLabel("Confirme le mot de passe").fill(MOT_DE_PASSE);
    await tel.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(tel).toHaveURL(/\/bienvenue/, { timeout: 30_000 });
    await expect(tel.getByRole("heading", { name: `Bienvenue ${prenom} !` })).toBeVisible();
    await expect(tel.getByRole("list", { name: "Tes premiers pas" })).toBeVisible();
    await eleve.close();

    // L'élève est dans la classe du Cheikh.
    await page.goto("/maitre");
    await expect(page.getByText(prenom).first()).toBeVisible({ timeout: 20_000 });
  });
});
