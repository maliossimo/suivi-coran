import { BookOpen, ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { ChoixPage } from "@/components/coran/ChoixPage";
import { ChoixSourate } from "@/components/coran/ChoixSourate";
import { LectureCoran } from "@/components/coran/LectureCoran";
import { chiffresArabes } from "@/domain/coran";
import { LIBELLE_LECTURE } from "@/domain/lectures";
import { exigerEspace } from "@/services/acces";
import { chargerPageCoran } from "@/services/coran";

export const metadata = { title: "Coran" };

export default async function PageCoran({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profil = await exigerEspace("admin");
  const p = await chargerPageCoran(profil, await searchParams);
  const lienSourate = (lecture: string, sourate: number) =>
    `/admin/coran?lecture=${lecture}&sourate=${sourate}`;
  const lienPage = (lecture: string, page: number) => `/admin/coran?lecture=${lecture}&vue=page&page=${page}`;
  const ici = (lecture: string) =>
    p.vue === "page" ? lienPage(lecture, p.page) : lienSourate(lecture, p.sourate);
  const bloc = p.blocs[0]!;
  const precedent =
    p.vue === "page"
      ? p.page > 1
        ? lienPage(p.lecture, p.page - 1)
        : null
      : p.sourate > 1
        ? lienSourate(p.lecture, p.sourate - 1)
        : null;
  const suivant =
    p.vue === "page"
      ? p.page < 604
        ? lienPage(p.lecture, p.page + 1)
        : null
      : p.sourate < 114
        ? lienSourate(p.lecture, p.sourate + 1)
        : null;

  return (
    <>
      <EnteteEspace titre="Coran" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-coran">
        <div className="coran-modes">
          <nav className="onglets" aria-label="Lecture">
            {(["hafs", "warsh"] as const).map((l) => (
              <Link
                key={l}
                href={ici(l)}
                className="onglet"
                aria-current={l === p.lecture ? "page" : undefined}
                scroll={false}
              >
                {LIBELLE_LECTURE[l]}
              </Link>
            ))}
          </nav>
          <nav className="coran-vues" aria-label="Affichage">
            <Link
              href={lienSourate(p.lecture, p.sourate)}
              aria-current={p.vue === "sourate" ? "page" : undefined}
              scroll={false}
            >
              <ScrollText size={16} aria-hidden="true" />
              Sourate
            </Link>
            <Link
              href={lienPage(p.lecture, p.page)}
              aria-current={p.vue === "page" ? "page" : undefined}
              scroll={false}
            >
              <BookOpen size={16} aria-hidden="true" />
              Mushaf
            </Link>
          </nav>
        </div>

        <div className="coran-navigation">
          {precedent ? (
            <Link
              className="mois-fleche"
              href={precedent}
              aria-label={p.vue === "page" ? "Page précédente" : "Sourate précédente"}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mois-fleche inactif" aria-hidden="true" />
          )}
          {p.vue === "page" ? (
            <ChoixPage lecture={p.lecture} page={p.page} juz={p.juz} debutsJuz={p.debutsJuz} />
          ) : (
            <ChoixSourate lecture={p.lecture} sourate={p.sourate} sourates={p.sourates} />
          )}
          {suivant ? (
            <Link
              className="mois-fleche"
              href={suivant}
              aria-label={p.vue === "page" ? "Page suivante" : "Sourate suivante"}
            >
              <ChevronRight size={22} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mois-fleche inactif" aria-hidden="true" />
          )}
        </div>

        {p.vue === "sourate" ? (
          <header className={`coran-cartouche coran-${p.lecture}`}>
            <p lang="ar" dir="rtl">
              سورة {bloc.nomAr}
            </p>
            <span>
              {bloc.sourate}. {bloc.nomLatin} · {bloc.nbVersets} versets · {LIBELLE_LECTURE[p.lecture]} ·{" "}
              <Link href={lienPage(p.lecture, p.page)}>page {p.page}</Link>
            </span>
          </header>
        ) : null}

        <LectureCoran
          key={`${p.lecture}-${p.vue}-${p.vue === "page" ? p.page : p.sourate}-${p.passage?.du ?? ""}-${p.passage?.au ?? ""}`}
          lecture={p.lecture}
          vue={p.vue}
          blocs={p.blocs}
          passageInitial={p.passage}
          correspondance={p.correspondance}
          recitations={p.recitations}
          bibliothequeDisponible={p.bibliothequeDisponible}
          titre={p.vue === "page" ? `Page ${p.page}` : `${bloc.sourate}. ${bloc.nomLatin}`}
          pagePrecedente={p.vue === "page" ? precedent : null}
          pageSuivante={p.vue === "page" ? suivant : null}
          piedDePage={
            p.vue === "page" ? (
              <footer className="coran-pied">
                <span>Juz {p.juz}</span>
                <span className="coran-numero-page" lang="ar">
                  {chiffresArabes(p.page)}
                </span>
                <span>Page {p.page}</span>
              </footer>
            ) : null
          }
        />

        <p className="coran-source">
          Texte : Complexe du Roi Fahd (KFGQPC). Tajwid : texte Tanzil.net, règles cpfair/quran-tajweed (CC BY
          4.0). Récitations : EveryAyah et mp3quran.net ; repères mot par mot : quran-surah-reciter-audio.
        </p>
      </main>
    </>
  );
}
