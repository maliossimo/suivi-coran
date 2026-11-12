"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { actionBasculerUtilisateur, actionDeplacerUtilisateur } from "@/app/actions/admin";
import { Avatar } from "@/components/Avatar";
import { EtiquetteLecture } from "@/components/ChoixLecture";
import { SuppressionUtilisateur } from "@/components/SuppressionUtilisateur";
import { correspondARecherche } from "@/domain/classe";
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
  lecture: Lecture | null;
}

function dateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
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
        <select aria-label="Rôle" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tous les rôles</option>
          <option value="eleve">Élèves</option>
          <option value="maitre">Cheikhs</option>
          <option value="admin">Admins</option>
        </select>
        <select aria-label="Établissement" value={etab} onChange={(e) => setEtab(e.target.value)}>
          <option value="">Tous les établissements</option>
          {etablissements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
          <option value="aucun">Sans établissement</option>
        </select>
        <select aria-label="Statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="archive">Désactivés</option>
          <option value="jamais">Jamais connectés</option>
        </select>
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
      <div className="tableau-defilant">
        <table className="tableau">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Établissement</th>
              <th>Inscrit le</th>
              <th>Dernière connexion</th>
              <th>Statut</th>
              <th>Suppression</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="nom-avec-avatar">
                    <Avatar prenom={u.prenom} nom={u.nom} cle={u.id} role={u.role} taille="petit" />
                    {`${u.prenom} ${u.nom}`.trim() || "—"}
                    {u.role === "eleve" ? <EtiquetteLecture lecture={u.lecture} /> : null}
                  </span>
                </td>
                <td>
                  <span className={`pastille-role pastille-${u.role}`}>{ROLES[u.role]}</span>
                </td>
                <td>
                  {u.role === "admin" ? (
                    "—"
                  ) : (
                    <form action={actionDeplacerUtilisateur} className="deplacer">
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="etablissementId"
                        aria-label={`Établissement de ${u.prenom} ${u.nom}`}
                        defaultValue={u.etablissementId ?? ""}
                        onChange={(e) => {
                          const nouveau = nomEtab.get(e.target.value);
                          if (
                            nouveau &&
                            window.confirm(`Déplacer ${`${u.prenom} ${u.nom}`.trim()} vers « ${nouveau} » ?`)
                          ) {
                            e.target.form?.requestSubmit();
                          } else {
                            e.target.value = u.etablissementId ?? "";
                          }
                        }}
                      >
                        {!u.etablissementId ? <option value="">—</option> : null}
                        {etablissements.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nom}
                          </option>
                        ))}
                      </select>
                    </form>
                  )}
                </td>
                <td>{dateCourte(u.creeLe)}</td>
                <td>{u.derniereConnexion ? dateHeure(u.derniereConnexion) : "Jamais"}</td>
                <td>
                  {u.id === moi ? (
                    "Vous"
                  ) : (
                    <form action={actionBasculerUtilisateur}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="actif" value={u.actif ? "false" : "true"} />
                      <button
                        type="submit"
                        className={u.actif ? "lien-action" : "lien-action lien-action-off"}
                      >
                        {u.actif ? "Actif · désactiver" : "Désactivé · réactiver"}
                      </button>
                    </form>
                  )}
                </td>
                <td>
                  {u.id === moi || u.role === "admin" ? (
                    "—"
                  ) : (
                    <SuppressionUtilisateur id={u.id} prenom={u.prenom} nom={u.nom} role={u.role} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
