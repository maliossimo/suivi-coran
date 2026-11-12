/**
 * Les deux lectures (riwayat) suivies dans l'appli : Hafs et Warsh.
 * Chaque élève a la sienne ; numérotation des versets et découpage en hizb en dépendent.
 *
 * Sources : données du Complexe du Roi Fahd (KFGQPC) — Hafs v18 (6236 versets),
 * Warsh v10 (6214 versets). Hizb impairs = débuts de juz de chaque mushaf ; hizb pairs
 * vérifiés sur les marques ۞ de chaque mushaf (en Warsh, comptage des huitièmes).
 * Code pur, testé.
 */

export type Lecture = "hafs" | "warsh";

export const LECTURES: readonly Lecture[] = ["hafs", "warsh"];

export const LIBELLE_LECTURE: Record<Lecture, string> = { hafs: "Hafs", warsh: "Warsh" };
export const NOM_ARABE_LECTURE: Record<Lecture, string> = { hafs: "حفص", warsh: "ورش" };

export const TOTAL_VERSETS_LECTURE: Record<Lecture, number> = { hafs: 6236, warsh: 6214 };

/** Index global (dans la numérotation de la lecture) du premier verset de chaque hizb, 1 à 60. */
export const DEBUTS_HIZB_LECTURE: Record<Lecture, readonly number[]> = {
  hafs: [
    1, 82, 149, 210, 260, 308, 385, 464, 517, 581, 641, 696, 751, 825, 900, 955, 1042, 1125, 1201, 1269, 1329,
    1390, 1479, 1557, 1649, 1726, 1803, 1952, 2030, 2128, 2215, 2349, 2484, 2596, 2674, 2812, 2876, 3043,
    3215, 3303, 3386, 3491, 3564, 3630, 3733, 3933, 4090, 4174, 4265, 4349, 4511, 4601, 4706, 4902, 5105,
    5178, 5242, 5448, 5673, 5949,
  ],
  warsh: [
    1, 82, 148, 208, 258, 307, 383, 463, 516, 578, 639, 692, 751, 826, 901, 960, 1043, 1127, 1203, 1272, 1332,
    1394, 1483, 1560, 1651, 1730, 1808, 1957, 2035, 2133, 2218, 2349, 2483, 2594, 2670, 2809, 2871, 3038,
    3211, 3299, 3382, 3485, 3558, 3624, 3727, 3927, 4081, 4163, 4252, 4332, 4491, 4581, 4686, 4879, 5083,
    5155, 5219, 5428, 5649, 5924,
  ],
};

/** Nombre de versets de chaque sourate en Warsh (compte madani), de la sourate 1 à 114. */
export const NB_VERSETS_WARSH: readonly number[] = [
  7, 285, 200, 175, 122, 167, 206, 76, 130, 109, 121, 111, 44, 54, 99, 128, 110, 105, 99, 134, 111, 76, 119,
  62, 77, 226, 95, 88, 69, 59, 33, 30, 73, 54, 46, 82, 182, 86, 72, 84, 53, 50, 89, 56, 36, 34, 39, 29, 18,
  45, 60, 47, 61, 55, 77, 99, 28, 21, 24, 13, 14, 11, 11, 18, 12, 12, 31, 52, 52, 44, 30, 28, 18, 55, 39, 31,
  50, 40, 45, 42, 29, 19, 36, 25, 22, 17, 19, 26, 32, 20, 15, 21, 11, 8, 8, 20, 5, 8, 9, 11, 10, 8, 3, 9, 5,
  5, 6, 3, 6, 3, 5, 4, 5, 6,
];

/** Lecture d'une valeur venue de la base ou d'un formulaire (Hafs par défaut). */
export function lireLecture(valeur: unknown): Lecture {
  return valeur === "warsh" ? "warsh" : "hafs";
}

/**
 * Les sourates dans la numérotation d'une lecture (le référentiel de la base est en Hafs) :
 * nombre de versets et index global du verset 1 recalculés.
 */
export function souratesDeLecture<
  S extends { numero: number; nbVersets: number; premierVersetGlobal: number },
>(sourates: readonly S[], lecture: Lecture): S[] {
  if (lecture === "hafs") return [...sourates];
  let premier = 1;
  return [...sourates]
    .sort((a, b) => a.numero - b.numero)
    .map((s) => {
      const nbVersets = NB_VERSETS_WARSH[s.numero - 1] ?? s.nbVersets;
      const resultat = { ...s, nbVersets, premierVersetGlobal: premier };
      premier += nbVersets;
      return resultat;
    });
}
