/**
 * Version de l'appli (numérotation x.y.z de package.json, fixée à la mise en production)
 * et commit déployé. Remplacées à la construction du site (next.config.ts).
 */
export const VERSION = process.env.NEXT_PUBLIC_VERSION ?? "dev";
export const COMMIT = process.env.NEXT_PUBLIC_COMMIT || null;

/** « Version 1.2.0 » */
export const LIBELLE_VERSION = `Version ${VERSION}`;
