"use client";

import { Check, Headphones, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  actionChangerEcouteAcquis,
  actionDeclarerAcquis,
  actionPasserAcquis,
  actionRetirerAcquis,
} from "@/app/actions/acquis";
import { retoursActives } from "@/components/retourSensoriel";
import type { PageAcquis } from "@/services/acquis";

type Partie = { de: number; a: number };

/**
 * « Ce que tu connais déjà » : l'élève touche les juz qu'il sait par cœur, ou indique des sourates
 * (« de … à … »), puis choisit s'il veut le faire écouter à son Cheikh. Ses parties déjà
 * déclarées sont listées dessous : il peut les retirer ou changer son choix d'écoute.
 */
export function FormulaireAcquis({ donnees, arrivee }: { donnees: PageAcquis; arrivee: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"juz" | "sourates">("juz");
  const [juz, setJuz] = useState<Set<number>>(new Set());
  const [parties, setParties] = useState<Partie[]>([]);
  const [aEcouter, setAEcouter] = useState<boolean | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const connus = new Set(donnees.juzConnus);
  const nomSourate = (n: number) => donnees.sourates.find((s) => s.numero === n);

  const rien = juz.size === 0 && parties.length === 0;
  const resume =
    juz.size && !parties.length
      ? `${juz.size} juz · environ ${((juz.size / 30) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % du Coran`
      : [
          juz.size ? `${juz.size} juz` : "",
          parties.length ? `${parties.length} partie${parties.length > 1 ? "s" : ""} en sourates` : "",
        ]
          .filter(Boolean)
          .join(" et ");

  const terminer = () => {
    if (arrivee) router.push("/eleve");
    else router.refresh();
  };

  const valider = () => {
    if (rien) return setErreur("Choisis d’abord ce que tu connais (juz ou sourates).");
    if (aEcouter === null) return setErreur("Dis-nous si tu veux le faire écouter à ton Cheikh.");
    setErreur(null);
    demarrer(async () => {
      const r = await actionDeclarerAcquis({ juz: [...juz], parties, aEcouter });
      if (!r.ok) return setErreur(r.erreur);
      if (retoursActives()) navigator.vibrate?.(12);
      setJuz(new Set());
      setParties([]);
      setAEcouter(null);
      terminer();
    });
  };

  const passer = () =>
    demarrer(async () => {
      await actionPasserAcquis();
      router.push("/eleve");
    });

  return (
    <div className="acquis">
      <header className="acquis-entete">
        <h1>Ce que tu connais déjà</h1>
        <p>
          Indique ce que tu sais déjà par cœur : ta progression partira de là. Ton Cheikh le verra sur ta
          fiche.
        </p>
      </header>

      <div className="acquis-modes" role="tablist" aria-label="Indiquer par">
        {(["juz", "sourates"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "acquis-mode actif" : "acquis-mode"}
            onClick={() => setMode(m)}
          >
            {m === "juz" ? "Par juz" : "Par sourates"}
          </button>
        ))}
      </div>

      {mode === "juz" ? (
        <section aria-label="Juz connus">
          <p className="acquis-aide">Touche les juz que tu sais par cœur.</p>
          <div className="acquis-juz">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
              const deja = connus.has(n);
              const choisi = deja || juz.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={deja ? "acquis-case deja" : choisi ? "acquis-case choisie" : "acquis-case"}
                  aria-pressed={choisi}
                  aria-label={deja ? `Juz ${n}, déjà indiqué` : `Juz ${n}`}
                  disabled={deja}
                  onClick={() =>
                    setJuz((s) => {
                      const copie = new Set(s);
                      if (copie.has(n)) copie.delete(n);
                      else copie.add(n);
                      return copie;
                    })
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section aria-label="Sourates connues" className="acquis-sourates">
          <p className="acquis-aide">Choisis une sourate, ou plusieurs à la suite (« de … à … »).</p>
          {parties.map((p, i) => (
            <div key={i} className="acquis-partie">
              <label>
                <span>De</span>
                <select
                  value={p.de}
                  onChange={(e) =>
                    setParties((l) => l.map((x, j) => (j === i ? { ...x, de: Number(e.target.value) } : x)))
                  }
                >
                  {donnees.sourates.map((s) => (
                    <option key={s.numero} value={s.numero}>
                      {s.numero}. {s.nomLatin}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>À</span>
                <select
                  value={p.a}
                  onChange={(e) =>
                    setParties((l) => l.map((x, j) => (j === i ? { ...x, a: Number(e.target.value) } : x)))
                  }
                >
                  {donnees.sourates.map((s) => (
                    <option key={s.numero} value={s.numero}>
                      {s.numero}. {s.nomLatin}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="acquis-retirer"
                aria-label="Retirer cette partie"
                onClick={() => setParties((l) => l.filter((_, j) => j !== i))}
              >
                <X size={18} aria-hidden="true" />
              </button>
              <p className="acquis-partie-arabe" lang="ar" dir="rtl">
                {nomSourate(Math.min(p.de, p.a))?.nomAr}
                {p.de !== p.a ? ` ← ${nomSourate(Math.max(p.de, p.a))?.nomAr ?? ""}` : ""}
              </p>
            </div>
          ))}
          <button
            type="button"
            className="bouton-secondaire acquis-ajouter"
            onClick={() => setParties((l) => [...l, { de: 114, a: 114 }])}
          >
            <Plus size={18} aria-hidden="true" /> Ajouter{" "}
            {parties.length ? "une autre partie" : "une sourate"}
          </button>
        </section>
      )}

      {rien ? null : (
        <>
          <p className="acquis-resume" role="status">
            {resume}
          </p>
          <fieldset className="acquis-ecoute">
            <legend>Veux-tu le faire écouter à ton Cheikh ?</legend>
            <button
              type="button"
              className={aEcouter === true ? "acquis-choix actif" : "acquis-choix"}
              aria-pressed={aEcouter === true}
              onClick={() => setAEcouter(true)}
            >
              <Headphones size={18} aria-hidden="true" /> Oui, je veux qu’il l’écoute
            </button>
            <button
              type="button"
              className={aEcouter === false ? "acquis-choix actif" : "acquis-choix"}
              aria-pressed={aEcouter === false}
              onClick={() => setAEcouter(false)}
            >
              <Check size={18} aria-hidden="true" /> Pas besoin
            </button>
          </fieldset>
        </>
      )}

      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      <button type="button" className="bouton acquis-valider" onClick={valider} disabled={enCours}>
        {enCours ? "Enregistrement…" : arrivee ? "Valider et continuer" : "Ajouter"}
      </button>
      {arrivee ? (
        <div className="acquis-passer">
          <button type="button" className="bouton-lien-texte" onClick={passer} disabled={enCours}>
            Je ne connais encore rien
          </button>
          <button type="button" className="bouton-lien-texte" onClick={passer} disabled={enCours}>
            Plus tard
          </button>
        </div>
      ) : null}

      {donnees.acquis.length ? <ListeAcquis acquis={donnees.acquis} /> : null}
    </div>
  );
}

/** Ce que l'élève a déjà indiqué : retirer une partie, ou changer son choix d'écoute. */
function ListeAcquis({ acquis }: { acquis: PageAcquis["acquis"] }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const agir = (f: () => Promise<{ ok: boolean; erreur?: string }>) =>
    demarrer(async () => {
      const r = await f();
      if (!r.ok) setErreur(r.erreur ?? "Le changement n’a pas pu se faire.");
      else router.refresh();
    });
  return (
    <section className="acquis-liste" aria-labelledby="titre-acquis-liste">
      <h2 id="titre-acquis-liste">Déjà indiqué</h2>
      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <ul>
        {acquis.map((a) => (
          <li key={a.id}>
            <span className="acquis-liste-libelle">{a.libelle}</span>
            <EtatAcquis a={a} />
            <span className="acquis-liste-actions">
              {!a.ecoute && !a.valide ? (
                <button
                  type="button"
                  className="bouton-lien-texte"
                  disabled={enCours}
                  onClick={() => agir(() => actionChangerEcouteAcquis(a.id, !a.aEcouter))}
                >
                  {a.aEcouter ? "Ne plus faire écouter" : "Faire écouter au Cheikh"}
                </button>
              ) : null}
              <button
                type="button"
                className="acquis-retirer"
                aria-label={`Retirer ${a.libelle}`}
                disabled={enCours}
                onClick={() => agir(() => actionRetirerAcquis(a.id))}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Où en est une partie déclarée : validée, écoutée, à écouter, ou connue sans écoute. */
export function EtatAcquis({ a }: { a: { aEcouter: boolean; ecoute: boolean; valide: boolean } }) {
  if (a.valide) return <span className="pastille-etat etat-valide">✓ Validé</span>;
  if (a.ecoute) return <span className="pastille-etat etat-ecoute">↺ À refaire</span>;
  if (a.aEcouter) return <span className="pastille-etat etat-a-ecouter">À écouter</span>;
  return <span className="pastille-etat acquis-declare">Déclaré</span>;
}
