"use client";

import { useRouter } from "next/navigation";

/** Liste des 114 sourates (phonétique et arabe) : le choix ouvre la sourate. */
export function ChoixSourate({
  lecture,
  sourate,
  sourates,
}: {
  lecture: string;
  sourate: number;
  sourates: { numero: number; nomLatin: string; nomAr: string }[];
}) {
  const router = useRouter();
  return (
    <select
      className="coran-choix"
      aria-label="Sourate"
      value={sourate}
      onChange={(e) => router.push(`/admin/coran?lecture=${lecture}&sourate=${e.target.value}`)}
    >
      {sourates.map((s) => (
        <option key={s.numero} value={s.numero}>
          {s.numero}. {s.nomLatin} — {s.nomAr}
        </option>
      ))}
    </select>
  );
}
