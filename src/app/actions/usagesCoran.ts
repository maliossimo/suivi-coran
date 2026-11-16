"use server";

import { noterUsage } from "@/services/usagesCoran";

/** Le téléphone signale une lecture, une écoute ou une récitation (compteur pour l'administration). */
export async function actionNoterUsageCoran(quoi: unknown, sourate: unknown): Promise<void> {
  await noterUsage({ quoi, sourate });
}
