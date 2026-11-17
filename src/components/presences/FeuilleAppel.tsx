"use client";

import { Check, CloudOff, MessageSquareText, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LIBELLE_STATUT, STATUTS, libelleResume, resumeAppel, type StatutPresence } from "@/domain/presences";
import { envoyerAppel } from "./appelsEnAttente";
import { Avatar } from "@/components/Avatar";
import { EtatVide } from "@/components/EtatVide";
import { retoursActives, retourSensoriel } from "@/components/retourSensoriel";

interface Membre {
  id: string;
  prenom: string;
  nom: string;
  avecCompte: boolean;
}

const ICONE: Record<StatutPresence, typeof Check> = { present: Check, absent: X };

/**
 * L'appel d'un cours : tout le monde est présent par défaut, on ne touche que les exceptions.
 * Sans réseau, l'appel est gardé dans le téléphone et part au retour de la connexion.
 */
export function FeuilleAppel({
  classeId,
  date: datePage,
  dateFixe,
  membres,
  deja: dejaPage,
  retour,
}: {
  classeId: string;
  date: string;
  /** La date vient de l'adresse ; sinon c'est « aujourd'hui » au moment où la page a été préparée. */
  dateFixe: boolean;
  membres: Membre[];
  deja: Record<string, { statut: StatutPresence; note: string }> | null;
  retour: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(datePage);
  const deja = date === datePage ? dejaPage : null;
  const [statuts, setStatuts] = useState<Record<string, StatutPresence>>(() =>
    Object.fromEntries(membres.map((m) => [m.id, deja?.[m.id]?.statut ?? "present"])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(membres.map((m) => [m.id, deja?.[m.id]?.note ?? ""])),
  );
  const [noteOuverte, setNoteOuverte] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "envoye" | "garde">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  // Page gardée hors ligne depuis un autre jour : l'appel est celui d'aujourd'hui, repart de zéro.
  useEffect(() => {
    const aujourdhui = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
    if (dateFixe || aujourdhui <= datePage) return;
    setDate(aujourdhui);
    setStatuts(Object.fromEntries(membres.map((m) => [m.id, "present"])));
    setNotes({});
  }, [dateFixe, datePage, membres]);

  const comptes = useMemo(() => resumeAppel(Object.values(statuts)), [statuts]);
  const resume = libelleResume(comptes);
  const partPresents = membres.length ? (comptes.present / membres.length) * 100 : 0;

  const enregistrer = async () => {
    setEnvoi("envoi");
    setErreur(null);
    const r = await envoyerAppel({
      classe: classeId,
      date,
      presences: membres.map((m) => ({
        membre: m.id,
        statut: statuts[m.id] ?? "present",
        note: notes[m.id]?.trim() || null,
      })),
    });
    if (typeof r === "object") {
      setErreur(r.erreur);
      setEnvoi("repos");
      return;
    }
    setEnvoi(r);
    retourSensoriel();
    if (r === "envoye") {
      // La page de la classe est relue au serveur à l'arrivée : pas de refresh en plus
      // (il interromprait la navigation).
      router.push(retour);
    }
  };

  const autreJour = date !== datePage;

  if (!membres.length) {
    return (
      <EtatVide titre="Aucun élève dans cette classe">
        <p>Ajoute d’abord les élèves : l’appel se fait ensuite en un toucher par élève.</p>
        <Link href={`/presences/${classeId}/modifier`} className="bouton bouton-lien">
          <UserPlus size={16} aria-hidden="true" /> Ajouter des élèves
        </Link>
      </EtatVide>
    );
  }

  return (
    <div className="feuille-appel">
      {autreJour ? (
        <p className="message-info" role="status">
          Appel d’aujourd’hui ({date.split("-").reverse().join("/")}).
        </p>
      ) : null}
      <div className="feuille-appel-resume" role="status">
        <strong>{resume}</strong>
        <span className="appel-jauge" aria-hidden="true">
          <span style={{ width: `${partPresents}%` }} />
        </span>
        <button
          type="button"
          className="puce-action"
          onClick={() => setStatuts(Object.fromEntries(membres.map((m) => [m.id, "present"])))}
        >
          Tous présents
        </button>
      </div>

      <ul className="liste-appel">
        {membres.map((m) => {
          const statut = statuts[m.id] ?? "present";
          return (
            <li key={m.id} className={`ligne-appel statut-${statut}`}>
              <div className="ligne-appel-tete">
                <Avatar prenom={m.prenom} nom={m.nom} cle={m.id} taille="petit" />
                <button
                  type="button"
                  className="ligne-appel-nom"
                  onClick={() => setNoteOuverte((o) => (o === m.id ? null : m.id))}
                  aria-expanded={noteOuverte === m.id}
                >
                  <span>
                    {m.prenom} {m.nom}
                  </span>
                  {notes[m.id] ? <MessageSquareText size={14} aria-label="Note" /> : null}
                  {!m.avecCompte ? <small>sans compte</small> : null}
                </button>
                <div className="choix-statut" role="radiogroup" aria-label={`Présence de ${m.prenom}`}>
                  {STATUTS.map((s) => {
                    const Icone = ICONE[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={statut === s}
                        aria-label={LIBELLE_STATUT[s]}
                        title={LIBELLE_STATUT[s]}
                        className={`statut-${s}`}
                        onClick={() => {
                          // Une vibration très courte (sans son) confirme le changement.
                          if (statut !== s && retoursActives()) navigator.vibrate?.(8);
                          setStatuts((x) => ({ ...x, [m.id]: s }));
                        }}
                      >
                        <Icone size={20} strokeWidth={2.6} aria-hidden="true" />
                        <span className="choix-statut-texte" aria-hidden="true">
                          {LIBELLE_STATUT[s]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {noteOuverte === m.id ? (
                <input
                  className="ligne-appel-note"
                  value={notes[m.id] ?? ""}
                  maxLength={200}
                  placeholder="Note (malade, prévenu par les parents…)"
                  onChange={(e) => setNotes((n) => ({ ...n, [m.id]: e.target.value }))}
                  autoFocus
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="legende-statuts">
        Tout le monde est présent au départ : touche la croix des absents, ou un nom pour ajouter une note.
      </p>

      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {envoi === "garde" ? (
        <p className="message-info" role="status">
          <CloudOff size={16} aria-hidden="true" /> Pas de réseau : l’appel est gardé sur le téléphone et
          partira tout seul au retour de la connexion.
        </p>
      ) : null}

      <div className="barre-enregistrer">
        <button
          type="button"
          className="bouton"
          onClick={() => void enregistrer()}
          disabled={envoi === "envoi"}
        >
          <Check size={18} aria-hidden="true" />
          {envoi === "envoi" ? "Enregistrement…" : deja ? "Mettre à jour l’appel" : "Enregistrer l’appel"}
        </button>
      </div>
    </div>
  );
}
