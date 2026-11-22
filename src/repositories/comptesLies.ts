import "server-only";
import { z } from "zod";
import type { Role } from "@/domain/roles";
import { clientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/server";

export interface CompteLie {
  id: string;
  prenom: string;
  nom: string;
  role: Role;
  actif: boolean;
}

/**
 * Comptes liés à `compteId`, avec leur nom. Les liens sont lus avec les droits de la personne connectée
 * (la base ne lui montre que les siens) ; les noms sont lus avec la clé « service role », car un élève
 * ne peut pas lire le profil d'un administrateur. L'appelant passe l'identifiant de la personne connectée.
 */
export async function comptesLiesDe(compteId: string): Promise<CompteLie[]> {
  const supabase = await creerClientServeur();
  const { data: liens, error } = await supabase.from("comptes_lies").select("lie_a").eq("compte", compteId);
  if (error) throw new Error(`Lecture des comptes liés impossible : ${error.message}`);
  const ids = z
    .array(z.object({ lie_a: z.string().uuid() }))
    .parse(liens)
    .map((l) => l.lie_a);
  if (ids.length === 0) return [];
  const admin = clientAdmin();
  if (!admin) return [];
  const { data, error: e } = await admin.from("profils").select("id, prenom, nom, role, actif").in("id", ids);
  if (e) throw new Error(`Lecture des comptes liés impossible : ${e.message}`);
  return z
    .array(
      z.object({
        id: z.string().uuid(),
        prenom: z.string(),
        nom: z.string(),
        role: z.enum(["eleve", "maitre", "admin"]),
        actif: z.boolean(),
      }),
    )
    .parse(data);
}

/** Tous les liens (administrateur) : paires distinctes avec les noms des deux comptes. */
export async function tousLesLiens(): Promise<{ a: CompteLie; b: CompteLie }[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.from("comptes_lies").select("compte, lie_a");
  if (error) throw new Error(`Lecture des comptes liés impossible : ${error.message}`);
  const liens = z.array(z.object({ compte: z.string().uuid(), lie_a: z.string().uuid() })).parse(data);
  const paires = liens.filter((l) => l.compte < l.lie_a);
  const ids = [...new Set(paires.flatMap((l) => [l.compte, l.lie_a]))];
  const admin = clientAdmin();
  if (!admin || ids.length === 0) return [];
  const { data: profils, error: e } = await admin
    .from("profils")
    .select("id, prenom, nom, role, actif")
    .in("id", ids);
  if (e) throw new Error(`Lecture des comptes liés impossible : ${e.message}`);
  const parId = new Map(
    z
      .array(
        z.object({
          id: z.string().uuid(),
          prenom: z.string(),
          nom: z.string(),
          role: z.enum(["eleve", "maitre", "admin"]),
          actif: z.boolean(),
        }),
      )
      .parse(profils)
      .map((p) => [p.id, p] as const),
  );
  return paires.flatMap((l) => {
    const a = parId.get(l.compte);
    const b = parId.get(l.lie_a);
    return a && b ? [{ a, b }] : [];
  });
}

/** Lien dans les deux sens (clé « service role » : à n'appeler que pour l'administrateur). */
export async function lier(a: string, b: string): Promise<boolean> {
  const admin = clientAdmin();
  if (!admin) return false;
  const { error } = await admin.from("comptes_lies").upsert(
    [
      { compte: a, lie_a: b },
      { compte: b, lie_a: a },
    ],
    { onConflict: "compte,lie_a", ignoreDuplicates: true },
  );
  return !error;
}

export async function delier(a: string, b: string): Promise<boolean> {
  const admin = clientAdmin();
  if (!admin) return false;
  const { error } = await admin
    .from("comptes_lies")
    .delete()
    .or(`and(compte.eq.${a},lie_a.eq.${b}),and(compte.eq.${b},lie_a.eq.${a})`);
  return !error;
}

/** Identifiant d'un compte à partir de son adresse e-mail (clé « service role »), ou null. */
export async function idParEmail(email: string): Promise<string | null> {
  const admin = clientAdmin();
  if (!admin) return null;
  const voulu = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const trouve = data.users.find((u) => u.email?.toLowerCase() === voulu);
    if (trouve) return trouve.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Ouvre la session du compte `cibleId` à la place de la session courante, sans mot de passe : un lien
 * à usage unique est fabriqué côté serveur puis utilisé aussitôt (rien n'est envoyé par e-mail).
 * L'appelant DOIT avoir vérifié que le lien entre les deux comptes existe.
 */
export async function ouvrirSessionDe(cibleId: string): Promise<boolean> {
  const admin = clientAdmin();
  if (!admin) return false;
  const { data: u, error: e1 } = await admin.auth.admin.getUserById(cibleId);
  const email = u?.user?.email;
  if (e1 || !email) return false;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const jeton = data?.properties?.hashed_token;
  if (error || !jeton) return false;
  const supabase = await creerClientServeur();
  const { error: e2 } = await supabase.auth.verifyOtp({ token_hash: jeton, type: "magiclink" });
  return !e2;
}
