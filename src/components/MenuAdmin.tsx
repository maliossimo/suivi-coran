import Link from "next/link";

export function MenuAdmin({ actif }: { actif: "tableau" | "journal" }) {
  return (
    <nav className="sous-menu" aria-label="Administration">
      <Link href="/admin" aria-current={actif === "tableau" ? "page" : undefined}>
        Tableau de bord
      </Link>
      <Link href="/admin/journal" aria-current={actif === "journal" ? "page" : undefined}>
        Journal d’audit
      </Link>
      <Link href="/maitre">Toutes les classes</Link>
    </nav>
  );
}
