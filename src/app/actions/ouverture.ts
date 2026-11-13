"use server";

import { signalerOuverture } from "@/services/ouvertures";

export async function actionOuverture(): Promise<void> {
  await signalerOuverture();
}
