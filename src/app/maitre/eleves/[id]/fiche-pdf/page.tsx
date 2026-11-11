import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FicheImprimable } from "@/components/fiche/FicheImprimable";
import { libelleMois, lireMois } from "@/domain/fiche";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";
import { aujourdhuiParis, chargerFicheImprimable } from "@/services/fiche";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ mois?: string }> };

async function eleveDeLaPage(params: Props["params"]) {
  await exigerEspace("maitre");
  const { id } = await params;
  const eleve = /^[0-9a-f-]{36}$/i.test(id) ? await chargerEleve(id) : null;
  if (!eleve) notFound();
  return eleve;
}

/** Le titre sert de nom au fichier PDF enregistré. */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const eleve = await eleveDeLaPage(params);
  const { mois } = await searchParams;
  return {
    title: `Fiche ${libelleMois(lireMois(mois, aujourdhuiParis()))} — ${eleve.prenom} ${eleve.nom}`.trim(),
  };
}

export default async function PageFichePdfMaitre({ params, searchParams }: Props) {
  const eleve = await eleveDeLaPage(params);
  const { mois } = await searchParams;
  const donnees = await chargerFicheImprimable(eleve.id, mois);
  return (
    <FicheImprimable
      donnees={donnees}
      eleve={`${eleve.prenom} ${eleve.nom}`.trim()}
      retour={`/maitre/eleves/${eleve.id}${mois ? `?mois=${encodeURIComponent(mois)}` : ""}`}
    />
  );
}
