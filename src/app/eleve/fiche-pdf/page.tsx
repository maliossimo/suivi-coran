import type { Metadata } from "next";
import { FicheImprimable } from "@/components/fiche/FicheImprimable";
import { libelleMois, lireMois } from "@/domain/fiche";
import { exigerEspace } from "@/services/acces";
import { aujourdhuiParis, chargerFicheImprimable } from "@/services/fiche";

type Props = { searchParams: Promise<{ mois?: string }> };

/** Le titre sert de nom au fichier PDF enregistré. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const profil = await exigerEspace("eleve");
  const { mois } = await searchParams;
  const nom = `${profil.prenom} ${profil.nom}`.trim();
  return { title: `Fiche ${libelleMois(lireMois(mois, aujourdhuiParis()))} — ${nom}` };
}

export default async function PageFichePdfEleve({ searchParams }: Props) {
  const profil = await exigerEspace("eleve");
  const { mois } = await searchParams;
  const donnees = await chargerFicheImprimable(profil.id, mois);
  return (
    <FicheImprimable
      donnees={donnees}
      eleve={`${profil.prenom} ${profil.nom}`.trim()}
      retour={`/eleve${mois ? `?mois=${encodeURIComponent(mois)}` : ""}`}
    />
  );
}
