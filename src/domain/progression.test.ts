import { describe, expect, it } from "vitest";
import type { Seance } from "./fiche";
import { aRenforcer, calculerProgression } from "./progression";
import { creerReferentiel, type Sourate } from "./versets";

const ref = creerReferentiel([
  { numero: 67, nomAr: "الملك", nomLatin: "Al-Mulk", nbVersets: 30, premierVersetGlobal: 5242 },
  { numero: 68, nomAr: "القلم", nomLatin: "Al-Qalam", nbVersets: 52, premierVersetGlobal: 5272 },
] satisfies Sourate[]);

const seance = (
  date: string,
  type: Seance["type"],
  dureeMin: number,
  passages: Seance["passages"],
): Seance => ({
  id: `${date}-${type}`,
  date,
  type,
  dureeMin,
  tajwid: null,
  noteLibre: null,
  corrigee: false,
  passages,
});
const mulk = (a: number, b: number) => ({ sourateDebut: 67, versetDebut: a, sourateFin: 67, versetFin: b });

const seances = [
  seance("2026-09-15", "apprentissage", 30, [{ ...mulk(1, 10), corrige: true }]),
  seance("2026-10-20", "apprentissage", 30, [mulk(11, 30)]),
  seance("2026-11-08", "apprentissage", 20, [
    { sourateDebut: 68, versetDebut: 1, sourateFin: 68, versetFin: 10 },
  ]),
  seance("2026-11-09", "revision", 25, [mulk(1, 30)]),
  seance("2026-11-10", "revision", 15, [mulk(1, 15)]),
];

describe("calculerProgression", () => {
  const p = calculerProgression(
    ref,
    seances,
    [
      { mois: "2026-11-01", semaine: 2, description: "x", statut: "atteint" },
      { mois: "2026-11-01", semaine: 1, description: "y", statut: "non_atteint" },
    ],
    "2026-11-10",
    { mois: 3, semaines: 4 },
  );

  it("compte les versets appris distincts (apprentissage seulement)", () => {
    expect(p.versetsAppris).toBe(40);
    expect(p.pourcentageCoran).toBe(0.6);
  });

  it("distingue les versets vus par le Cheikh des versets seulement déclarés", () => {
    expect(p.versetsVus).toBe(10);
    const mulkProgression = p.sourates.find((s) => s.sourate.numero === 67)!;
    expect(mulkProgression.versetsAppris).toBe(30);
    expect(mulkProgression.versetsVus).toBe(10);
    expect(p.sourates.find((s) => s.sourate.numero === 68)!.versetsVus).toBe(0);
    expect(p.souratesCompletes).toBe(1);
    expect(p.souratesCompletesVues).toBe(0);
    expect(p.pourcentageCoranVu).toBeLessThan(p.pourcentageCoran);
  });

  it("cumule les versets mois par mois", () => {
    expect(p.cumulParMois.map((m) => [m.cle, m.valeur])).toEqual([
      ["2026-09", 10],
      ["2026-10", 30],
      ["2026-11", 40],
    ]);
  });

  it("répartit les minutes par semaine glissante", () => {
    const derniere = p.minutesParSemaine.at(-1)!;
    expect(derniere.apprentissage).toBe(20);
    expect(derniere.revision).toBe(40);
    expect(p.minutesParSemaine).toHaveLength(4);
  });

  it("construit une grille de régularité du lundi au dimanche", () => {
    expect(p.regularite).toHaveLength(4);
    expect(p.regularite.every((c) => c.length === 7)).toBe(true);
    const derniere = p.regularite.at(-1)!;
    expect(derniere[0]?.date).toBe("2026-11-09"); // lundi
    expect(derniere[0]?.niveau).toBe(2); // 25 min
    expect(derniere[2]?.futur).toBe(true); // mercredi 11
  });

  it("compte les jours consécutifs", () => {
    expect(p.joursConsecutifs).toBe(3); // 8, 9, 10 novembre
  });

  it("donne les objectifs atteints par mois", () => {
    expect(p.objectifsParMois.at(-1)).toMatchObject({ cle: "2026-11", atteints: 1, total: 2 });
  });

  it("suit l'avancement par sourate et la dernière révision", () => {
    const [qalam, mulkP] = p.sourates;
    expect(qalam?.sourate.numero).toBe(68);
    expect(qalam?.pourcentage).toBe(19);
    expect(mulkP?.pourcentage).toBe(100);
    expect(mulkP?.derniereRevision).toBe("2026-11-10");
    expect(p.souratesCompletes).toBe(1);
    expect(aRenforcer(mulkP!, "2026-11-10")).toBe(false);
    expect(aRenforcer(qalam!, "2026-11-10")).toBe(true);
  });
});
