import { PageCoranComplete } from "@/components/coran/PageCoranComplete";
import { exigerEspace } from "@/services/acces";
import { chargerPageCoran } from "@/services/coran";

export const metadata = { title: "Coran" };

export default async function PageCoran({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profil = await exigerEspace("admin");
  const p = await chargerPageCoran(profil, await searchParams);
  return (
    <PageCoranComplete
      p={p}
      base="/admin/coran"
      nom={`${profil.prenom} ${profil.nom}`.trim()}
      role={profil.role}
      choixLecture
    />
  );
}
