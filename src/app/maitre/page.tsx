import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { cleMois, decalerMois, formaterDuree, libelleMois, lireMois } from "@/domain/fiche";
import { Squelettes } from "@/components/Chargement";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EtatVide } from "@/components/EtatVide";
import { ListeEleves } from "@/components/ListeEleves";
import { VueAdmin } from "@/components/admin/VueAdmin";
import { AppelDuJour } from "@/components/presences/AppelDuJour";
import { exigerEspace } from "@/services/acces";
import { listerClasses } from "@/services/admin";
import { chargerClasse, classesDuCheikh } from "@/services/classe";
import { aujourdhuiParis } from "@/services/fiche";
import { chargerAppelDuJour } from "@/services/presences";

/** Chiffres de la classe et liste des élèves, chargés après l'en-tête. */
async function ContenuClasse({
  moisParam,
  classeId,
  eleveIds,
}: {
  moisParam?: string;
  classeId?: string;
  /** Cheikh avec plusieurs classes : seulement les élèves de la classe choisie. */
  eleveIds?: string[];
}) {
  const complete = await chargerClasse(moisParam, classeId);
  const garder = eleveIds ? new Set(eleveIds) : null;
  const classe = garder
    ? {
        ...complete,
        actifs: complete.actifs.filter((r) => garder.has(r.eleve.id)),
        archives: complete.archives.filter((r) => garder.has(r.eleve.id)),
      }
    : complete;
  const cle = cleMois(classe.mois);
  const minutes = classe.actifs.reduce((t, r) => t + r.minutesApprentissage + r.minutesRevision, 0);
  const atteints = classe.actifs.reduce((t, r) => t + r.objectifsAtteints, 0);
  const objectifs = classe.actifs.reduce((t, r) => t + r.objectifsTotal, 0);
  const enAlerte = classe.actifs.filter((r) => r.alerte).length;

  return (
    <>
      <div className="tuiles">
        <div className="tuile">
          <strong>{classe.actifs.length}</strong>
          <span>élève{classe.actifs.length > 1 ? "s" : ""}</span>
        </div>
        <div className="tuile">
          <strong>{formaterDuree(minutes)}</strong>
          <span>de travail ce mois-ci</span>
        </div>
        <div className="tuile">
          <strong>
            {atteints} / {objectifs}
          </strong>
          <span>objectifs atteints</span>
        </div>
        <div className={enAlerte ? "tuile tuile-alerte" : "tuile"}>
          <strong>{enAlerte}</strong>
          <span>sans saisie depuis 3 jours</span>
        </div>
      </div>

      {classe.actifs.length === 0 ? (
        <EtatVide titre="Aucun élève pour l’instant">
          <p>Invite tes élèves : ils recevront un e-mail pour choisir leur mot de passe.</p>
          <Link href="/maitre/inviter" className="bouton bouton-auto">
            Inviter un élève
          </Link>
        </EtatVide>
      ) : null}
      <ListeEleves actifs={classe.actifs} archives={classe.archives} cleMois={cle} />
    </>
  );
}

export default async function PageClasse({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; classe?: string; groupe?: string }>;
}) {
  const profil = await exigerEspace("maitre");
  const { mois: moisParam, classe: classeParam, groupe: groupeParam } = await searchParams;
  const mois = lireMois(moisParam, aujourdhuiParis());
  // L'admin regarde une mosquée précise (lien « Voir les élèves » de l'administration).
  const admin = profil.role === "admin";
  const [classes, appelDuJour, sesClasses] = await Promise.all([
    admin ? listerClasses(profil) : Promise.resolve([]),
    chargerAppelDuJour(profil),
    classesDuCheikh(profil),
  ]);
  const classe = admin ? classes.find((c) => c.id === classeParam) : undefined;
  // Plusieurs classes : un onglet par classe (« Toutes » par défaut).
  const groupe = sesClasses.length > 1 ? sesClasses.find((c) => c.id === groupeParam) : undefined;
  const suffixe = classe ? `&classe=${classe.id}` : groupe ? `&groupe=${groupe.id}` : "";
  return (
    <>
      <EnteteEspace
        titre={admin ? "Élèves" : "Ma classe"}
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role}
      />
      <main className="espace">
        {classe ? null : <AppelDuJour classes={appelDuJour} />}
        <div className="entete-page">
          <nav className="mois mois-compact" aria-label="Changer de mois">
            <Link
              className="mois-fleche"
              prefetch
              href={`/maitre?mois=${cleMois(decalerMois(mois, -1))}${suffixe}`}
              aria-label="Mois précédent"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </Link>
            <h1 className="mois-titre">{libelleMois(mois)}</h1>
            <Link
              className="mois-fleche"
              prefetch
              href={`/maitre?mois=${cleMois(decalerMois(mois, 1))}${suffixe}`}
              aria-label="Mois suivant"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </Link>
          </nav>
          {/* Le Cheikh a l'onglet « Inviter » en bas ; l'admin n'a que ce bouton. */}
          {admin && !classe ? (
            <Link href="/maitre/inviter" className="bouton bouton-lien">
              + Inviter des élèves
            </Link>
          ) : null}
        </div>

        {sesClasses.length > 1 ? (
          <nav className="puces-periode" aria-label="Classe">
            <Link
              href={`/maitre?mois=${cleMois(mois)}`}
              className={groupe ? "puce-periode" : "puce-periode actif"}
              aria-current={groupe ? undefined : "true"}
              replace
              scroll={false}
            >
              Toutes
            </Link>
            {sesClasses.map((c) => (
              <Link
                key={c.id}
                href={`/maitre?mois=${cleMois(mois)}&groupe=${c.id}`}
                className={c.id === groupe?.id ? "puce-periode actif" : "puce-periode"}
                aria-current={c.id === groupe?.id ? "true" : undefined}
                replace
                scroll={false}
              >
                {c.nom}
              </Link>
            ))}
          </nav>
        ) : null}
        <VueAdmin actif={Boolean(classe)} classe={classe?.nom}>
          <Suspense key={`${cleMois(mois)}-${groupe?.id ?? ""}`} fallback={<Squelettes cartes={1} />}>
            <ContenuClasse moisParam={moisParam} classeId={classe?.id} eleveIds={groupe?.eleveIds} />
          </Suspense>
        </VueAdmin>
      </main>
    </>
  );
}
