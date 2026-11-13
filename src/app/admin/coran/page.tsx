import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { ChoixSourate } from "@/components/coran/ChoixSourate";
import { LectureCoran } from "@/components/coran/LectureCoran";
import { LIBELLE_LECTURE } from "@/domain/lectures";
import { exigerEspace } from "@/services/acces";
import { chargerPageCoran } from "@/services/coran";

export const metadata = { title: "Coran" };

const BASMALA = {
  hafs: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
  warsh: "بِسْمِ اِ۬للَّهِ اِ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ",
} as const;

export default async function PageCoran({
  searchParams,
}: {
  searchParams: Promise<{ lecture?: string; sourate?: string }>;
}) {
  const profil = await exigerEspace("admin");
  const p = await chargerPageCoran(profil, await searchParams);
  const lien = (lecture: string, sourate: number) => `/admin/coran?lecture=${lecture}&sourate=${sourate}`;
  const n = p.sourate.numero;

  return (
    <>
      <EnteteEspace titre="Coran" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-coran">
        <nav className="onglets" aria-label="Lecture">
          {(["hafs", "warsh"] as const).map((l) => (
            <Link
              key={l}
              href={lien(l, n)}
              className="onglet"
              aria-current={l === p.lecture ? "page" : undefined}
              scroll={false}
            >
              {LIBELLE_LECTURE[l]}
            </Link>
          ))}
        </nav>

        <div className="coran-navigation">
          {n > 1 ? (
            <Link className="mois-fleche" href={lien(p.lecture, n - 1)} aria-label="Sourate précédente">
              <ChevronLeft size={22} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mois-fleche inactif" aria-hidden="true" />
          )}
          <ChoixSourate
            lecture={p.lecture}
            sourate={n}
            sourates={p.sourates.map((s) => ({ numero: s.numero, nomLatin: s.nomLatin, nomAr: s.nomAr }))}
          />
          {n < 114 ? (
            <Link className="mois-fleche" href={lien(p.lecture, n + 1)} aria-label="Sourate suivante">
              <ChevronRight size={22} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mois-fleche inactif" aria-hidden="true" />
          )}
        </div>

        <header className={`coran-cartouche coran-${p.lecture}`}>
          <p lang="ar" dir="rtl">
            سورة {p.sourate.nomAr}
          </p>
          <span>
            {n}. {p.sourate.nomLatin} · {p.sourate.nbVersets} versets · {LIBELLE_LECTURE[p.lecture]}
          </span>
        </header>

        <LectureCoran
          key={`${p.lecture}-${n}`}
          lecture={p.lecture}
          sourate={n}
          nomSourate={`${n}. ${p.sourate.nomLatin}`}
          basmala={n !== 1 && n !== 9 ? BASMALA[p.lecture] : null}
          versets={p.versets}
          tajwid={p.tajwid}
          recitations={p.recitations}
          bibliothequeDisponible={p.bibliothequeDisponible}
        />

        <p className="coran-source">
          Texte : Complexe du Roi Fahd (KFGQPC). Tajwid : texte Tanzil.net, règles cpfair/quran-tajweed (CC BY
          4.0). Récitations : EveryAyah et mp3quran.net.
        </p>
      </main>
    </>
  );
}
