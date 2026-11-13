import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { LectureCoran } from "@/components/coran/LectureCoran";
import { NavigationCoran } from "@/components/coran/NavigationCoran";
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
        <NavigationCoran
          lecture={p.lecture}
          vue={p.vue}
          sourate={p.sourate}
          page={p.page}
          juz={p.juz}
          sourates={p.sourates}
          debutsJuz={p.debutsJuz}
          precedent={precedent}
          suivant={suivant}
        />

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
          liensLecture={{ hafs: ici("hafs"), warsh: ici("warsh") }}
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
