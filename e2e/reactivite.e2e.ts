import { COMPTES, expect, seConnecter, test } from "./outils";

/**
 * Mesure (sans seuil bloquant) : temps d'affichage des pages principales, chargement
 * complet puis navigation dans l'appli. Les chiffres sont écrits dans le journal du CI
 * pour suivre la réactivité d'une version à l'autre.
 */
test("réactivité : temps d'affichage des pages principales", async ({ page }) => {
  const mesures: string[] = [];
  const chrono = async (nom: string, action: () => Promise<unknown>) => {
    const debut = Date.now();
    await action();
    mesures.push(`${nom.padEnd(38)} ${String(Date.now() - debut).padStart(6)} ms`);
  };

  await chrono("connexion (admin)", () => seConnecter(page, COMPTES.admin, /\/admin/));
  for (const [nom, url] of [
    ["admin (chargement complet)", "/admin"],
    ["ma classe (chargement complet)", "/maitre"],
    ["présences (chargement complet)", "/presences"],
    ["coran Al-Kahf (chargement complet)", "/admin/coran?lecture=hafs&sourate=18"],
  ] as const) {
    await chrono(nom, () => page.goto(url, { waitUntil: "load" }));
  }

  // Navigation dans l'appli : onglets du bas (le contenu change sans recharger).
  await page.goto("/admin");
  // Mesure jusqu'à l'affichage du titre de la nouvelle page (et non l'inactivité du réseau,
  // qui dépend des préchargements et faussait les chiffres).
  for (const [onglet, adresse] of [
    ["Présences", /\/presences(\?|$)/],
    ["Coran", /\/admin\/coran/],
    ["Admin", /\/admin(\?|$)/],
  ] as const) {
    await chrono(`onglet « ${onglet} » (navigation)`, async () => {
      await page.getByRole("link", { name: onglet, exact: true }).first().click();
      await page.waitForURL(adresse);
      await page.locator("main h1, main h2").first().waitFor();
    });
  }

  console.log(`--- Réactivité ---\n${mesures.join("\n")}`);
  expect(mesures.length).toBeGreaterThan(0);
});
