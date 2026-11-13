import { Eye } from "lucide-react";
import Link from "next/link";
import type { PointDeVue } from "@/domain/presences";

const APERCUS: { vue: PointDeVue | null; libelle: string }[] = [
  { vue: null, libelle: "Ma vue" },
  { vue: "cheikh", libelle: "Cheikh" },
  { vue: "responsable", libelle: "Responsable" },
];

const EXPLICATION: Record<"cheikh" | "responsable", string> = {
  cheikh: "Il fait l’appel et ajoute les élèves arrivés en cours d’année, sans créer de classe.",
  responsable:
    "Il organise les classes et sort le rapport des présences ; il ne fait pas l’appel et ne voit pas le Coran.",
};

/**
 * Aperçu réservé à l'administrateur : « Voir comme le Cheikh / le responsable ».
 * `chemin` : la page courante, sans `vue`.
 */
export function ChoixVue({ chemin, apercu }: { chemin: string; apercu: PointDeVue | null }) {
  const lien = (vue: PointDeVue | null) =>
    vue ? `${chemin}${chemin.includes("?") ? "&" : "?"}vue=${vue}` : chemin;
  return (
    <div className="choix-vue">
      <div className="choix-vue-onglets" role="group" aria-label="Voir comme">
        <Eye size={15} aria-hidden="true" />
        {APERCUS.map((a) => (
          <Link
            key={a.libelle}
            href={lien(a.vue)}
            className={a.vue === apercu ? "actif" : undefined}
            aria-current={a.vue === apercu ? "page" : undefined}
            scroll={false}
            replace
          >
            {a.libelle}
          </Link>
        ))}
      </div>
      {apercu && apercu !== "admin" ? (
        <p className="choix-vue-explication" role="status">
          <b>Aperçu {apercu === "cheikh" ? "du Cheikh" : "du responsable"}</b> · {EXPLICATION[apercu]}
        </p>
      ) : null}
    </div>
  );
}
