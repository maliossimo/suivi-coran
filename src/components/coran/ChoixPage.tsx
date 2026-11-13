"use client";

import { useRouter } from "next/navigation";

/** Vue mushaf : aller à un juz ou à une page. */
export function ChoixPage({
  lecture,
  page,
  juz,
  debutsJuz,
}: {
  lecture: string;
  page: number;
  juz: number;
  debutsJuz: readonly number[];
}) {
  const router = useRouter();
  const aller = (p: number) => router.push(`/admin/coran?lecture=${lecture}&vue=page&page=${p}`);
  return (
    <div className="coran-choix-page">
      <select
        className="coran-choix"
        aria-label="Juz"
        value={juz}
        onChange={(e) => aller(debutsJuz[Number(e.target.value) - 1] ?? 1)}
      >
        {debutsJuz.map((_, i) => (
          <option key={i} value={i + 1}>
            Juz {i + 1}
          </option>
        ))}
      </select>
      <select
        className="coran-choix"
        aria-label="Page"
        value={page}
        onChange={(e) => aller(Number(e.target.value))}
      >
        {Array.from({ length: 604 }, (_, i) => (
          <option key={i} value={i + 1}>
            Page {i + 1}
          </option>
        ))}
      </select>
    </div>
  );
}
