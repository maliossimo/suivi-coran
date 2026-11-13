"use client";

import { Bookmark, BookOpen, ChevronDown, ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Feuille } from "@/components/Feuille";
import { rechercherSourates } from "@/domain/recherche";
import { useMarquePages } from "./marquePages";

interface SourateListe {
  numero: number;
  nomLatin: string;
  nomAr: string;
  nbVersets: number;
}

type Onglet = "sourates" | "juz" | "page" | "marques";

/**
 * En-tête du lecteur : sourate ou page précédente / suivante, et un titre qui ouvre
 * « Aller à » (liste des sourates avec recherche, juz, numéro de page).
 */
export function NavigationCoran({
  lecture,
  vue,
  sourate,
  page,
  juz,
  sourates,
  debutsJuz,
  precedent,
  suivant,
}: {
  lecture: "hafs" | "warsh";
  vue: "sourate" | "page";
  sourate: number;
  page: number;
  juz: number;
  sourates: readonly SourateListe[];
  debutsJuz: readonly number[];
  precedent: string | null;
  suivant: string | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>(vue === "page" ? "juz" : "sourates");
  const [recherche, setRecherche] = useState("");
  const [numeroPage, setNumeroPage] = useState(String(page));

  const lienSourate = (n: number) => `/admin/coran?lecture=${lecture}&sourate=${n}`;
  const lienPage = (n: number) => `/admin/coran?lecture=${lecture}&vue=page&page=${n}`;
  const actuelle = sourates.find((s) => s.numero === sourate);

  const marquePages = useMarquePages();
  const marques = marquePages.liste.filter((m) => m.lecture === lecture);
  const nomSourate = useMemo(() => new Map(sourates.map((s) => [s.numero, s])), [sourates]);

  const trouvees = useMemo(() => rechercherSourates(sourates, recherche), [recherche, sourates]);

  const aller = (href: string) => {
    setOuvert(false);
    const [chemin, ancre] = href.split("#");
    // Même page : seulement l'ancre (le lecteur va au verset) ; sinon, navigation.
    if (ancre && chemin === `${window.location.pathname}${window.location.search}`) {
      window.location.hash = ancre;
      return;
    }
    router.push(href);
    // Filet de sécurité : si la navigation dans l'appli n'a pas abouti (interrompue par une
    // autre requête), on ouvre la page normalement plutôt que de laisser l'élève attendre.
    const avant = window.location.href;
    setTimeout(() => {
      if (window.location.href === avant) window.location.assign(href);
    }, 3_000);
  };

  return (
    <>
      <div className="coran-entete">
        <nav className="coran-segments" aria-label="Affichage">
          <Link
            href={lienSourate(sourate)}
            aria-current={vue === "sourate" ? "page" : undefined}
            scroll={false}
          >
            <ScrollText size={16} aria-hidden="true" />
            Sourate
          </Link>
          <Link href={lienPage(page)} aria-current={vue === "page" ? "page" : undefined} scroll={false}>
            <BookOpen size={16} aria-hidden="true" />
            Mushaf
          </Link>
        </nav>
        <div className="coran-navigation">
          {precedent ? (
            <Link
              className="mois-fleche"
              href={precedent}
              aria-label={vue === "page" ? "Page précédente" : "Sourate précédente"}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mois-fleche inactif" aria-hidden="true" />
          )}
          <button
            type="button"
            className="coran-aller"
            onClick={() => {
              setRecherche("");
              setNumeroPage(String(page));
              setOuvert(true);
            }}
            aria-haspopup="dialog"
          >
            <span>
              {vue === "page" ? (
                <>
                  <b>Page {page}</b> · Juz {juz}
                </>
              ) : (
                <>
                  <b>
                    {sourate}. {actuelle?.nomLatin}
                  </b>{" "}
                  <span lang="ar">{actuelle?.nomAr}</span>
                </>
              )}
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {suivant ? (
            <Link
              className="mois-fleche"
              href={suivant}
              aria-label={vue === "page" ? "Page suivante" : "Sourate suivante"}
            >
              <ChevronRight size={22} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mois-fleche inactif" aria-hidden="true" />
          )}
        </div>
      </div>

      <Feuille ouverte={ouvert} onFermer={() => setOuvert(false)} titre="Aller à">
        <div className="coran-segments coran-onglets-aller" role="tablist" aria-label="Aller à">
          {(
            [
              ["sourates", "Sourate"],
              ["juz", "Juz"],
              ["page", "Page"],
              ["marques", "Marques"],
            ] as const
          ).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={onglet === cle}
              onClick={() => setOnglet(cle)}
            >
              {libelle}
            </button>
          ))}
        </div>

        {onglet === "sourates" ? (
          <>
            <label className="coran-recherche">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Nom ou numéro (ex. Kahf, 18)"
                aria-label="Chercher une sourate"
                enterKeyHint="search"
              />
            </label>
            <ul className="coran-liste-sourates">
              {trouvees.map((s) => (
                <li key={s.numero}>
                  <button
                    type="button"
                    aria-current={vue === "sourate" && s.numero === sourate ? "true" : undefined}
                    onClick={() => aller(lienSourate(s.numero))}
                  >
                    <span className="coran-liste-numero">{s.numero}</span>
                    <span className="coran-liste-nom">
                      <b>{s.nomLatin}</b>
                      <small>{s.nbVersets} versets</small>
                    </span>
                    <span lang="ar" dir="rtl" className="coran-liste-arabe">
                      {s.nomAr}
                    </span>
                  </button>
                </li>
              ))}
              {trouvees.length === 0 ? (
                <li className="carte-graphique-sous">Aucune sourate trouvée.</li>
              ) : null}
            </ul>
          </>
        ) : onglet === "marques" ? (
          marques.length ? (
            <ul className="coran-liste-sourates">
              {marques.map((m) => {
                const s = nomSourate.get(m.sourate);
                return (
                  <li key={`${m.sourate}-${m.verset}`} className="coran-marque">
                    <button
                      type="button"
                      onClick={() => aller(`${lienSourate(m.sourate)}#verset-${m.sourate}-${m.verset}`)}
                    >
                      <span className="coran-liste-numero">
                        <Bookmark size={15} aria-hidden="true" />
                      </span>
                      <span className="coran-liste-nom">
                        <b>
                          {s?.nomLatin ?? `Sourate ${m.sourate}`} · verset {m.verset}
                        </b>
                        <small>
                          Ajouté le{" "}
                          {new Date(m.ajouteLe).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </small>
                      </span>
                      <span lang="ar" dir="rtl" className="coran-liste-arabe">
                        {s?.nomAr}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="coran-marque-retirer"
                      onClick={() => marquePages.basculer(m)}
                      aria-label={`Retirer le marque-page ${s?.nomLatin ?? m.sourate} ${m.verset}`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="carte-graphique-sous">
              Pas encore de marque-page. Touche un verset, puis « Marque-page » pour le retrouver ici.
            </p>
          )
        ) : onglet === "juz" ? (
          <div className="coran-grille-juz">
            {debutsJuz.map((debut, i) => (
              <button
                key={i}
                type="button"
                aria-current={vue === "page" && juz === i + 1 ? "true" : undefined}
                onClick={() => aller(lienPage(debut))}
              >
                <b>{i + 1}</b>
                <small>p. {debut}</small>
              </button>
            ))}
          </div>
        ) : (
          <form
            className="coran-aller-page"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.min(604, Math.max(1, Math.round(Number(numeroPage)) || 1));
              aller(lienPage(n));
            }}
          >
            <label className="coran-reglage">
              <span>Page du mushaf (1 à 604)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={604}
                value={numeroPage}
                onChange={(e) => setNumeroPage(e.target.value)}
              />
            </label>
            <button type="submit" className="bouton">
              Ouvrir la page
            </button>
          </form>
        )}
      </Feuille>
    </>
  );
}
