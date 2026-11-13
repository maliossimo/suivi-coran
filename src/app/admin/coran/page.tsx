import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { LecteurRecitation } from "@/components/coran/LecteurRecitation";
import { ChoixSourate } from "@/components/coran/ChoixSourate";
import { TailleTexteCoran } from "@/components/coran/TailleTexteCoran";
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

        <div className="mois coran-navigation">
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

        <LecteurRecitation
          lecture={p.lecture}
          sourate={n}
          recitateurs={
            p.recitateurs?.map((r) => ({ id: r.id, nom: r.nom, style: r.style, serveur: r.serveur })) ?? null
          }
        />

        <article className={`coran-texte coran-${p.lecture}`} lang="ar" dir="rtl">
          <header className="coran-entete">
            <h1>
              <span lang="ar">سورة {p.sourate.nomAr}</span>
              <small lang="fr" dir="ltr">
                {n}. {p.sourate.nomLatin} · {p.sourate.nbVersets} versets · {LIBELLE_LECTURE[p.lecture]}
              </small>
            </h1>
            <TailleTexteCoran />
          </header>
          {n !== 1 && n !== 9 ? <p className="coran-basmala">{BASMALA[p.lecture]}</p> : null}
          <p className="coran-versets">
            {p.versets.map((v, i) => (
              <span key={i} className="coran-verset" id={`v${i + 1}`}>
                {v}{" "}
              </span>
            ))}
          </p>
        </article>

        <p className="coran-source">
          Texte : Complexe du Roi Fahd pour l’impression du Saint Coran (KFGQPC). Récitations : mp3quran.net.
        </p>
      </main>
    </>
  );
}
