import { appuiLong, capture, COMPTES, expect, seConnecter, test } from "./outils";

test.describe("Coran (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
  });

  test("page du Mushaf : les lignes du livre, sans débordement ; le texte caché se dévoile ligne par ligne", async ({
    page,
  }) => {
    await page.goto("/admin/coran?lecture=hafs&vue=page&page=50");
    const lignes = page.locator(".coran-ligne");
    // Page 50 : titre, basmala et 13 lignes de versets, comme dans le Mushaf de Médine.
    await expect(lignes).toHaveCount(13);
    await expect(lignes.first()).toContainText("الٓمٓ");
    await capture(page, "41-coran-page-mushaf");
    // Chaque ligne tient sur la largeur de la page.
    const deborde = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".coran-ligne")].some(
        (l) => l.scrollWidth > l.clientWidth + 2,
      ),
    );
    expect(deborde).toBe(false);

    await page.getByRole("button", { name: "Cacher le texte pour réviser" }).click();
    await expect(page.locator(".coran-page")).toHaveClass(/coran-cache/);
    await expect(page.getByText("Texte caché : touche une ligne pour la dévoiler.")).toBeVisible();
    await lignes.nth(2).click();
    await expect(lignes.nth(2)).toHaveClass(/devoile/);
    // Un toucher en mode caché dévoile, il n'ouvre pas les actions du verset.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Montrer tout le texte" }).click();
    await expect(page.locator(".coran-page")).not.toHaveClass(/coran-cache/);

    // Panneau du tajwid : allumer les couleurs, puis « seulement la qalqala » d'un raccourci.
    await page.getByRole("button", { name: "Couleurs du tajwid", exact: true }).click();
    const panneau = page.getByRole("dialog");
    const interrupteur = panneau.getByRole("switch", { name: "Couleurs du tajwid" });
    if ((await interrupteur.getAttribute("aria-checked")) !== "true") await interrupteur.click();
    await panneau.getByRole("button", { name: "Qalqala", exact: true }).click();
    await expect(panneau.getByRole("button", { name: "Qalqala", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".coran-page")).toHaveClass(/sans-tj-madd-2/);
    await expect(page.locator(".coran-page")).not.toHaveClass(/sans-tj-qalqala/);
    await capture(page, "42-coran-panneau-tajwid");
    await panneau.getByRole("button", { name: "Toutes", exact: true }).click();
    await expect(page.locator(".coran-page")).not.toHaveClass(/sans-tj-/);
    await page.keyboard.press("Escape");

    // Recherche : des mots arabes sans voyelles trouvent le verset du Trône.
    await page.getByRole("button", { name: "Rechercher dans le Coran" }).click();
    const recherche = page.getByRole("dialog");
    await recherche.getByRole("searchbox").fill("الكرسي");
    const resultat = recherche.getByRole("link", { name: /2:255/ });
    await expect(resultat).toBeVisible();
    await capture(page, "43-coran-recherche");
    await resultat.click();
    await expect(page).toHaveURL(/sourate=2&du=255&au=255/);
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
    // L'appli doit être prête (texte du Coran interactif) avant le geste.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.locator(".coran-page[data-pret]")).toBeVisible();
    const verset = page.locator('.coran-verset[data-cle="18:10"]');
    await verset.scrollIntoViewIfNeeded();
    // Au milieu d'un mot du verset (un verset peut s'étaler sur plusieurs lignes).
    await appuiLong(page, verset.locator(".mot").nth(1));
    const feuille = page.getByRole("dialog", { name: "Verset 10" });
    await expect(feuille).toBeVisible();
    // Le doigt relevé (sur le voile ou sur un bouton de la feuille) ne la referme pas.
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

  test("iPhone : le geste retour ferme la feuille sans quitter la page, et n'annule pas une navigation", async ({
    page,
  }) => {
    // Comme Safari : pas de CloseWatcher (Chrome sur Android ferme déjà les feuilles seul).
    await page.addInitScript(() => {
      delete (window as { CloseWatcher?: unknown }).CloseWatcher;
    });
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.locator('.coran-verset[data-cle="1:2"]').click();
    const feuille = page.getByRole("dialog", { name: "Verset 2" });
    await expect(feuille).toBeVisible();
    await page.goBack();
    await expect(feuille).toBeHidden();
    await expect(page).toHaveURL(/sourate=1(&|$)/);

    // Une sourate choisie depuis « Aller à » s'ouvre ; un seul retour ramène à la précédente.
    await page.locator(".coran-aller").click();
    const aller = page.getByRole("dialog", { name: "Aller à" });
    await aller.getByRole("searchbox", { name: "Chercher une sourate" }).fill("kahf");
    await aller
      .getByRole("button", { name: /Al-Kahf/ })
      .first()
      .click();
    await expect(page).toHaveURL(/sourate=18/, { timeout: 15_000 });
    await page.goBack();
    await expect(page).toHaveURL(/sourate=1(&|$)/, { timeout: 15_000 });
    await expect(page.getByRole("dialog")).toHaveCount(0);
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

test.describe("Vérifier ma récitation", () => {
  test("l'appli délivre un jeton au compte qui peut ouvrir le Coran", async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
    const r = await page.request.post("/api/tajwid/jeton");
    expect(r.status()).toBe(200);
    expect((await r.json()).jeton).toMatch(/^[\w-]+\.[0-9a-f]{64}$/);
  });

  test("l'élève a son jeton ; un Cheikh, qui n'ouvre pas le Coran, n'en a pas", async ({ browser }) => {
    for (const [compte, arrivee, statut] of [
      [COMPTES.eleveA, /\/eleve/, 200],
      [COMPTES.cheikhA, /\/maitre/, 403],
    ] as const) {
      const contexte = await browser.newContext();
      const page = await contexte.newPage();
      await seConnecter(page, compte, arrivee);
      const r = await page.request.post("/api/tajwid/jeton");
      expect(r.status(), compte).toBe(statut);
      await contexte.close();
    }
  });

  test("mode Réciter : la récitation est analysée par morceaux, chaque mot coloré, avec ses remarques", async ({
    page,
  }) => {
    // Micro simulé : un son régulier (celui de Chrome ne fait que des bips).
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // 1,2 s de son, 0,5 s de silence : comme une voix qui respire, sans vraie pause.
        for (let t = 0; t < 60; t += 1.7) {
          gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
          gain.gain.setValueAtTime(0, ctx.currentTime + t + 1.2);
        }
        const dest = ctx.createMediaStreamDestination();
        osc.connect(gain).connect(dest);
        osc.start();
        return dest.stream;
      };
    });
    // Le moteur (fonction Python sur Vercel) ne tourne pas ici : sa réponse est simulée.
    let envois = 0;
    let suivis = 0;
    await page.route("**/api/moteur_tajwid**", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { pret: true } });
      const url = new URL(route.request().url());
      // Ici, le suivi passe par le serveur (celui du téléphone est testé à part).
      if (url.searchParams.has("reference"))
        return route.fulfill({ status: 503, json: { erreur: "Indisponible." } });
      if (url.searchParams.has("suivi")) {
        // Suivi en direct : seulement jusqu'où l'élève est arrivé.
        suivis++;
        return route.fulfill({ json: { couverts: [0, 2] } });
      }
      envois++;
      // Le serveur ne répond pas la première fois : l'envoi est réessayé, la récitation n'est pas perdue.
      if (envois === 1) return route.fulfill({ status: 503, json: { erreur: "Indisponible." } });
      expect(route.request().headers()["authorization"]).toMatch(/^Jeton /);
      expect(url.searchParams.get("du")).toBe("2");
      expect((route.request().postDataBuffer()?.length ?? 0) % 2).toBe(0);
      const mot = (
        indice: number,
        texte: string,
        etat: string,
        remarques: { regle: string; texte: string; sure?: boolean }[] = [],
      ) => ({
        verset: 2,
        place: indice,
        indice,
        mot: texte,
        etat,
        remarques: remarques.map((r) => ({ gravite: etat === "erreur" ? "jali" : "khafi", ...r })),
        madd: [],
        debut: indice * 0.5,
        fin: indice * 0.5 + 0.5,
      });
      await route.fulfill({
        json: {
          entendu: "…",
          couverts: [0, 4],
          tempo: [0.2],
          passage: [
            [2, 0, "ٱلْحَمْدُ"],
            [2, 1, "لِلَّهِ"],
            [2, 2, "رَبِّ"],
            [2, 3, "ٱلْعَٰلَمِينَ"],
          ],
          mots: [
            mot(0, "ٱلْحَمْدُ", "juste"),
            mot(1, "لِلَّهِ", "juste"),
            mot(2, "رَبِّ", "erreur", [{ regle: "shadda", texte: "la chadda sur ب n’a pas été prononcée" }]),
            mot(3, "ٱلْعَٰلَمِينَ", "a_revoir", [
              {
                regle: "AaredMaddRule",
                texte: "madd ʿarid (à l’arrêt) trop long : 8 temps au lieu de 6 temps",
                sure: false,
              },
            ]),
          ],
        },
      });
    });
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.locator('.coran-verset[data-cle="1:2"]').click();
    await page.getByRole("button", { name: "Vérifier ma récitation à partir d’ici" }).click();
    const reciter = page.getByRole("dialog", { name: "Réciter" });
    await expect(reciter).toBeVisible();
    await expect(reciter.getByRole("status").filter({ hasText: "Prêt : touche le micro" })).toBeVisible();
    // Couleurs du tajwid sur les lettres, avec leur légende ; un bouton les masque (choix retenu).
    await expect(reciter.locator(".reciter-texte .tj").first()).toBeVisible();
    await expect(reciter.getByText("Couleurs du tajwid")).toBeVisible();
    await reciter.getByRole("button", { name: "Masquer les couleurs du tajwid" }).click();
    await expect(reciter.locator(".reciter-texte .tj")).toHaveCount(0);
    await reciter.getByRole("button", { name: "Montrer les couleurs du tajwid" }).click();
    await expect(reciter.locator(".reciter-texte .tj").first()).toBeVisible();
    await reciter.getByRole("button", { name: "Commencer la récitation" }).click();
    await expect(reciter.getByText("Son parfait")).toBeVisible({ timeout: 10_000 });
    // Le suivi en direct part toutes les 2 s.
    await expect.poll(() => suivis, { timeout: 10_000 }).toBeGreaterThan(0);
    await reciter.getByRole("button", { name: "J’ai fini" }).click();

    await expect(reciter.getByText("1 mot à reprendre")).toBeVisible({ timeout: 20_000 });
    expect(envois).toBe(2);
    await expect(reciter.getByText("50 % de mots justes")).toBeVisible();
    await expect(reciter.getByText("1 à vérifier (l’appli hésite)")).toBeVisible();
    await expect(reciter.getByRole("button", { name: "Réécouter ce mot" })).toBeVisible();
    await expect(reciter.getByLabel("fin du verset 2")).toBeVisible();
    // La première faute nette est montrée d'office.
    await expect(reciter.getByText("La chadda sur ب n’a pas été prononcée.")).toBeVisible();
    await expect(reciter.getByRole("button", { name: "Toi" })).toBeVisible();
    await reciter.getByRole("button", { name: /ٱلْعَٰلَمِينَ : à vérifier/ }).click();
    await expect(reciter.getByText("L’appli n’est pas sûre", { exact: false })).toBeVisible();
    await expect(reciter.getByText(/Madd ʿarid \(à l’arrêt\) trop long/)).toBeVisible();
    await capture(page, "45-reciter-resultat");
    await reciter.getByRole("button", { name: "L’appli s’est trompée" }).click();
    await expect(reciter.getByText(/Merci, c’est noté/)).toBeVisible();
    // Signalé par l'admin : la remarque disparaît et devient une correction apprise.
    await expect(reciter.getByText(/Madd ʿarid \(à l’arrêt\) trop long/)).toHaveCount(0);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    // Le signalement part en arrière-plan : le journal est relu jusqu'à ce qu'il y figure.
    await expect
      .poll(
        async () => {
          await page.goto("/admin/journal");
          return page.getByText("Corrections apprises (1)").count();
        },
        { timeout: 20_000 },
      )
      .toBe(1);
    await expect(page.getByText(/Madd ʿarid/).first()).toBeVisible();
  });
});

test.describe("Coran (élève)", () => {
  test("l'onglet Coran : les cartes « Réciter » et « Lire et écouter », la lecture dans la sienne", async ({
    page,
  }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    await page.getByRole("link", { name: "Coran", exact: true }).first().click();
    await expect(page).toHaveURL(/\/eleve\/coran$/);
    await expect(page.getByRole("heading", { name: "Réciter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lire et écouter" })).toBeVisible();
    await expect(page.getByText("Ta voix n’est jamais enregistrée")).toBeVisible();
    await capture(page, "44-coran-eleve");

    await page.getByRole("link", { name: "Ouvrir le Coran" }).click();
    await expect(page).toHaveURL(/\/eleve\/coran\/lire/);
    await expect(page.locator(".coran-page[data-pret]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réciter", exact: true })).toBeVisible();
    // L'élève lit dans sa lecture : pas de choix Hafs / Warsh dans les réglages.
    await page.getByRole("button", { name: "Réglages" }).click();
    await expect(page.getByRole("navigation", { name: "Lecture" })).toHaveCount(0);
  });

  test("un lien « Réciter » ouvre directement le mode Réciter sur le passage", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    await page.goto("/eleve/coran/lire?sourate=1&du=2&au=4&reciter=1");
    await expect(page.getByRole("dialog", { name: "Réciter" })).toBeVisible();
  });
});

test.describe("Suivi sur le téléphone", () => {
  test("le modèle compressé se charge dans le navigateur et écoute sans le serveur", async ({ page }) => {
    test.setTimeout(180_000);
    const journal: string[] = [];
    page.on("console", (m) => journal.push(`${m.type()}: ${m.text()}`));
    page.on("pageerror", (e) => journal.push(`erreur : ${e.message}`));
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // Comme une voix qui respire : 1,2 s de son, 0,5 s de silence.
        for (let t = 0; t < 120; t += 1.7) {
          gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
          gain.gain.setValueAtTime(0, ctx.currentTime + t + 1.2);
        }
        const dest = ctx.createMediaStreamDestination();
        osc.connect(gain).connect(dest);
        osc.start();
        return dest.stream;
      };
    });
    let suivisServeur = 0;
    let references = 0;
    await page.route("**/api/moteur_tajwid**", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { pret: true } });
      const url = new URL(route.request().url());
      if (url.searchParams.has("reference")) {
        references++;
        // Écriture attendue (simulée) : trois mots.
        return route.fulfill({
          json: {
            phonemes: "ٱلحَمدُلِلّاهِرَببِ",
            spans: [
              [0, 7],
              [7, 15],
              [15, 20],
            ],
            passage: [
              [2, 0, "ٱلْحَمْدُ"],
              [2, 1, "لِلَّهِ"],
              [2, 2, "رَبِّ"],
            ],
          },
        });
      }
      if (url.searchParams.has("suivi")) suivisServeur++;
      return route.fulfill({ status: 503, json: { erreur: "Indisponible." } });
    });
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.locator('.coran-verset[data-cle="1:2"]').click();
    await page.getByRole("button", { name: "Vérifier ma récitation à partir d’ici" }).click();
    const reciter = page.getByRole("dialog", { name: "Réciter" });
    // Téléchargé, vérifié (empreinte) et prêt.
    await expect(reciter).toHaveAttribute("data-suivi", "pret", { timeout: 120_000 });
    await reciter.getByRole("button", { name: "Commencer la récitation" }).click();
    // Le modèle a écouté sur place, et le passage vient de l'écriture attendue.
    await expect(reciter, journal.join("\n")).toHaveAttribute("data-suivi-essai", "ok", { timeout: 30_000 });
    expect(references).toBe(1);
    expect(suivisServeur).toBe(0);
    await expect(reciter.locator(".reciter-mot")).toHaveCount(3);
  });
});
