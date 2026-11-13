import { ChevronLeft, Mail, QrCode as IconeQr } from "lucide-react";
import Link from "next/link";
import { actionDesactiverQr, actionGenererQr } from "@/app/actions/classe";
import { CopierLien } from "@/components/CopierLien";
import { EnteteEspace } from "@/components/EnteteEspace";
import { Selecteur } from "@/components/Selecteur";
import { FormulaireInvitation } from "@/components/FormulaireInvitation";
import { QrCode } from "@/components/QrCode";
import { envPublic } from "@/lib/env";
import { exigerEspace } from "@/services/acces";
import { listerClasses } from "@/services/admin";
import { chargerQrClasse, classesDuCheikh } from "@/services/classe";

function dateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function PageInviter({
  searchParams,
}: {
  searchParams: Promise<{ classe?: string; cours?: string }>;
}) {
  const profil = await exigerEspace("maitre");
  const admin = profil.role === "admin";
  const { classe, cours } = await searchParams;
  const [classes, sesClasses] = await Promise.all([
    admin ? listerClasses(profil) : Promise.resolve([]),
    classesDuCheikh(profil),
  ]);
  // L'admin choisit l'établissement ; le Cheikh invite dans sa classe (au choix s'il en a plusieurs).
  const classeChoisie = admin ? classes.find((c) => c.id === classe) : undefined;
  const coursChoisi = sesClasses.find((c) => c.id === cours) ?? sesClasses[0];
  const qr =
    admin && !classeChoisie ? null : await chargerQrClasse(profil, classeChoisie?.id, coursChoisi?.id);
  const champClasse = (
    <>
      {classeChoisie ? <input type="hidden" name="etablissementId" value={classeChoisie.id} /> : null}
      {coursChoisi ? <input type="hidden" name="classe" value={coursChoisi.id} /> : null}
    </>
  );
  const lien = qr ? `${envPublic.NEXT_PUBLIC_SITE_URL}/rejoindre/${qr.code}` : null;

  return (
    <>
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <Link href="/maitre" className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Toute la classe
        </Link>
        <header className="seance-entete">
          <h1>Inviter des élèves</h1>
          <p>Deux façons, au choix : un QR code à scanner en classe, ou une invitation par e-mail.</p>
        </header>

        {sesClasses.length > 1 ? (
          <nav className="puces-periode" aria-label="Classe">
            {sesClasses.map((c) => (
              <Link
                key={c.id}
                href={`/maitre/inviter?cours=${c.id}`}
                className={c.id === coursChoisi?.id ? "puce-periode actif" : "puce-periode"}
                aria-current={c.id === coursChoisi?.id ? "true" : undefined}
                replace
                scroll={false}
              >
                {c.nom}
              </Link>
            ))}
          </nav>
        ) : null}

        {admin ? (
          <form method="get" className="choix-classe">
            <label htmlFor="classe">Classe</label>
            <Selecteur
              id="classe"
              titre="Classe"
              name="classe"
              defaultValue={classeChoisie?.id ?? ""}
              vide="Choisir une classe…"
              options={classes.map((c) => ({ valeur: c.id, libelle: c.nom }))}
              soumettre
            />
          </form>
        ) : null}

        {admin && !classeChoisie ? (
          <p className="carte-graphique-sous">Choisis la classe dans laquelle inscrire les élèves.</p>
        ) : (
          <>
            <section className="carte-invitation">
              <h2>
                <IconeQr size={20} aria-hidden="true" /> Par QR code
                {classeChoisie ? <small className="qr-classe">· {classeChoisie.nom}</small> : null}
              </h2>
              {qr && lien ? (
                <>
                  <p className="carte-graphique-sous">
                    Montre ce code à tes élèves : ils le scannent avec l’appareil photo de leur téléphone et
                    créent leur compte eux-mêmes. Ils arrivent directement dans ta classe.
                  </p>
                  <QrCode texte={lien} libelle="QR code pour rejoindre la classe" />
                  <p className="qr-infos">
                    Valable jusqu’au {dateHeure(qr.expireLe)}
                    <br />
                    {qr.utilisations === 0
                      ? "Aucun élève inscrit avec ce code pour l’instant."
                      : `${qr.utilisations} élève${qr.utilisations > 1 ? "s" : ""} inscrit${qr.utilisations > 1 ? "s" : ""} avec ce code.`}
                  </p>
                  <div className="qr-actions">
                    <CopierLien lien={lien} />
                    <form action={actionGenererQr}>
                      {champClasse}
                      <button type="submit" className="bouton-secondaire">
                        Nouveau code
                      </button>
                    </form>
                    <form action={actionDesactiverQr}>
                      {champClasse}
                      <button type="submit" className="bouton-secondaire bouton-texte-danger">
                        Désactiver
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <p className="carte-graphique-sous">
                    Le plus simple en classe : tu affiches un QR code sur ton téléphone, chaque élève le
                    scanne et s’inscrit tout seul. Le code reste valable 7 jours et tu peux le désactiver à
                    tout moment.
                  </p>
                  <form action={actionGenererQr}>
                    {champClasse}
                    <button type="submit" className="bouton">
                      <IconeQr size={18} aria-hidden="true" /> Afficher le QR code de la classe
                    </button>
                  </form>
                </>
              )}
            </section>

            <section className="carte-invitation">
              <h2>
                <Mail size={20} aria-hidden="true" /> Par e-mail
              </h2>
              <p className="carte-graphique-sous">
                L’élève reçoit un e-mail avec un lien pour choisir son mot de passe.
              </p>
              <FormulaireInvitation
                cible="eleve"
                etablissementId={classeChoisie?.id}
                classeId={coursChoisi?.id}
              />
            </section>
          </>
        )}
      </main>
    </>
  );
}
