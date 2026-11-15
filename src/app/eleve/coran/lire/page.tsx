import { PageCoranComplete } from "@/components/coran/PageCoranComplete";
import { exigerEleveAvecLecture } from "@/services/acces";
import { chargerPageCoran } from "@/services/coran";

export const metadata = { title: "Coran" };

export default async function PageLireCoran({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [profil, params] = await Promise.all([exigerEleveAvecLecture(), searchParams]);
  const p = await chargerPageCoran(profil, params);
  const du = Number(params.du);
  const au = Number(params.au);
  const reciterInitial =
    params.reciter === "1" && Number.isInteger(du) && Number.isInteger(au) && du >= 1 && au >= du
      ? { du, au }
      : null;
  return (
    <PageCoranComplete
      p={p}
      base="/eleve/coran/lire"
      nom={`${profil.prenom} ${profil.nom}`.trim()}
      role={profil.role}
      choixLecture={profil.role === "admin"}
      reciterInitial={reciterInitial}
    />
  );
}
