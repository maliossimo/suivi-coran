"use client";

import { Ellipsis, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { actionBasculerUtilisateur, actionDeplacerUtilisateur } from "@/app/actions/admin";
import { Avatar } from "@/components/Avatar";
import { Selecteur } from "@/components/Selecteur";
import { EtiquetteLecture } from "@/components/ChoixLecture";
import { SuppressionUtilisateur } from "@/components/SuppressionUtilisateur";
import { correspondARecherche } from "@/domain/classe";
import { depuisQuand } from "@/domain/journal";
import type { Lecture } from "@/domain/lectures";
import type { Role } from "@/domain/roles";

const ROLES = { eleve: "Élève", maitre: "Cheikh", admin: "Admin" } as const;

export interface LigneUtilisateur {
  id: string;
  role: Role;
  prenom: string;
  nom: string;
  actif: boolean;
  etablissementId: string | null;
  creeLe: string;
  derniereConnexion: string | null;
  derniereUtilisation: string | null;
  lecture: Lecture | null;
}

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/** Liste des comptes avec recherche et filtres (rôle, établissement, statut), et leurs actions. */
export function TableauUtilisateurs({
  utilisateurs,
  etablissements,
  moi,
}: {
  utilisateurs: LigneUtilisateur[];
  etablissements: { id: string; nom: string }[];
  moi: string;
}) {
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState("");
  const [etab, setEtab] = useState("");
  const [statut, setStatut] = useState("");
  const nomEtab = useMemo(() => new Map(etablissements.map((e) => [e.id, e.nom])), [etablissements]);

  const visibles = utilisateurs.filter(
    (u) =>
      correspondARecherche(u, recherche) &&
      (!role || u.role === role) &&
      (!etab || (etab === "aucun" ? !u.etablissementId : u.etablissementId === etab)) &&
      (!statut ||
        (statut === "actif" && u.actif) ||
        (statut === "archive" && !u.actif) ||
        (statut === "jamais" && !u.derniereConnexion)),
  );
  const filtre = recherche || role || etab || statut;

  return (
    <>
      <div className="filtres-admin">
        <label className="recherche">
          <span className="recherche-icone" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            type="search"
            className="recherche-champ"
            placeholder="Rechercher un nom…"
            aria-label="Rechercher un utilisateur par prénom ou nom"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            autoComplete="off"
          />
        </label>
        <Selecteur
          titre="Rôle"
          valeur={role}
          onChange={setRole}
          options={[
            { valeur: "", libelle: "Tous les rôles" },
            { valeur: "eleve", libelle: "Élèves" },
            { valeur: "maitre", libelle: "Cheikhs" },
            { valeur: "admin", libelle: "Admins" },
          ]}
          compact
        />
        <Selecteur
          titre="Établissement"
          valeur={etab}
          onChange={setEtab}
          options={[
            { valeur: "", libelle: "Tous les établissements" },
            ...etablissements.map((e) => ({ valeur: e.id, libelle: e.nom })),
            { valeur: "aucun", libelle: "Sans établissement" },
          ]}
          compact
        />
        <Selecteur
          titre="Statut"
          valeur={statut}
          onChange={setStatut}
          options={[
            { valeur: "", libelle: "Tous les statuts" },
            { valeur: "actif", libelle: "Actifs" },
            { valeur: "archive", libelle: "Désactivés" },
            { valeur: "jamais", libelle: "Jamais connectés" },
          ]}
          compact
        />
      </div>
      {filtre ? (
        <p className="carte-graphique-sous">
          {visibles.length} compte{visibles.length > 1 ? "s" : ""} sur {utilisateurs.length}
          {" · "}
          <button
            type="button"
            className="bouton-lien-texte"
            onClick={() => {
              setRecherche("");
              setRole("");
              setEtab("");
              setStatut("");
            }}
          >
            Tout afficher
          </button>
        </p>
      ) : null}
      <ul className="liste-comptes">
        {visibles.map((u) => {
          const nomComplet = `${u.prenom} ${u.nom}`.trim() || "Sans nom";
          return (
            <li key={u.id} className={u.actif ? undefined : "compte-desactive"}>
              <Avatar prenom={u.prenom} nom={u.nom} cle={u.id} role={u.role} taille="petit" />
              <span className="compte-identite">
                <span className="compte-nom">
                  <b>{nomComplet}</b>
                  <span className={`pastille-role pastille-${u.role}`}>{ROLES[u.role]}</span>
                  {u.role === "eleve" ? <EtiquetteLecture lecture={u.lecture} /> : null}
                </span>
                <small suppressHydrationWarning>
                  {u.etablissementId ? `${nomEtab.get(u.etablissementId) ?? ""} · ` : ""}
                  {u.actif ? "" : "désactivé · "}
                  {u.derniereUtilisation
                    ? `vu ${depuisQuand(u.derniereUtilisation, new Date())}`
                    : `jamais connecté · inscrit le ${dateCourte(u.creeLe)}`}
                </small>
              </span>
              {u.id === moi ? (
                <span className="compte-moi">Toi</span>
              ) : (
                <details className="menu-plus compte-menu">
                  <summary aria-label={`Actions pour ${nomComplet}`}>
                    <Ellipsis size={20} aria-hidden="true" />
                  </summary>
                  <div className="menu-plus-liste">
                    {u.role !== "admin" ? (
                      <form action={actionDeplacerUtilisateur} className="deplacer menu-plus-champ">
                        <input type="hidden" name="id" value={u.id} />
                        <span>Établissement</span>
                        <Selecteur
                          titre={`Établissement de ${nomComplet}`}
                          name="etablissementId"
                          defaultValue={u.etablissementId ?? ""}
                          vide="—"
                          options={etablissements.map((e) => ({ valeur: e.id, libelle: e.nom }))}
                          avantChoix={(v) =>
                            v === (u.etablissementId ?? "") ||
                            window.confirm(`Déplacer ${nomComplet} vers « ${nomEtab.get(v) ?? ""} » ?`)
                          }
                          soumettre
                          compact
                        />
                      </form>
                    ) : null}
                    <form action={actionBasculerUtilisateur}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="actif" value={u.actif ? "false" : "true"} />
                      <button type="submit" className="menu-plus-item">
                        {u.actif ? "Désactiver le compte" : "Réactiver le compte"}
                        <small>
                          {u.actif
                            ? "Il ne pourra plus se connecter ; rien n’est effacé."
                            : "Il pourra se reconnecter."}
                        </small>
                      </button>
                    </form>
                    {u.role !== "admin" ? (
                      <div className="menu-plus-item-danger">
                        <SuppressionUtilisateur id={u.id} prenom={u.prenom} nom={u.nom} role={u.role} />
                      </div>
                    ) : null}
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
