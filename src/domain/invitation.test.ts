import { describe, expect, it } from "vitest";
import { codeValide, etatInvitation, expirationDepuis } from "./invitation";

const maintenant = new Date("2026-11-11T18:00:00Z");

describe("etatInvitation", () => {
  it("valide tant que le code est actif et pas expiré", () => {
    expect(etatInvitation({ actif: true, expireLe: "2026-11-18T18:00:00Z" }, maintenant)).toBe("valide");
  });
  it("expirée après la date", () => {
    expect(etatInvitation({ actif: true, expireLe: "2026-11-11T17:59:59Z" }, maintenant)).toBe("expiree");
  });
  it("désactivée par le maître, même avant la date", () => {
    expect(etatInvitation({ actif: false, expireLe: "2026-11-18T18:00:00Z" }, maintenant)).toBe("desactivee");
  });
});

describe("expirationDepuis", () => {
  it("ajoute 7 jours par défaut", () => {
    expect(expirationDepuis(maintenant)).toBe("2026-11-18T18:00:00.000Z");
  });
});

describe("codeValide", () => {
  it("accepte un code base64url assez long et refuse le reste", () => {
    expect(codeValide("Ab3_-xYz0123456789abcd")).toBe(true);
    expect(codeValide("court")).toBe(false);
    expect(codeValide("avec espace dedans 1234567")).toBe(false);
    expect(codeValide("../../etc/passwd-aaaaaaaaaaaaa")).toBe(false);
  });
});
