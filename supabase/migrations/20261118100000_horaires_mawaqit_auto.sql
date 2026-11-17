-- =====================================================================
--  Horaires de la mosquée mis à jour automatiquement depuis sa page Mawaqit (une fois par mois,
--  par le serveur) : en plus des heures d'adhan, l'iqama de chaque prière et Joumou'a.
--  Le suivi de l'import (date, dernière erreur) reste sur l'établissement.
--  Droits inchangés : lecture par l'établissement, écriture par l'admin (et le serveur).
-- =====================================================================

alter table public.horaires_priere
  add column iqama_fajr    smallint check (iqama_fajr between 0 and 1439),
  add column iqama_dhuhr   smallint check (iqama_dhuhr between 0 and 1439),
  add column iqama_asr     smallint check (iqama_asr between 0 and 1439),
  add column iqama_maghrib smallint check (iqama_maghrib between 0 and 1439),
  add column iqama_isha    smallint check (iqama_isha between 0 and 1439),
  add constraint horaires_iqama_apres_adhan check (
    coalesce(iqama_fajr >= fajr, true) and coalesce(iqama_dhuhr >= dhuhr, true)
    and coalesce(iqama_asr >= asr, true) and coalesce(iqama_maghrib >= maghrib, true)
    and coalesce(iqama_isha >= isha, true)
  );

alter table public.etablissements
  -- Heures de Joumou'a (1 à 3), en minutes depuis minuit.
  add column jumua smallint[] check (
    jumua is null or (cardinality(jumua) between 1 and 3 and 0 <= all (jumua) and 1439 >= all (jumua))
  ),
  add column mawaqit_importe_le timestamptz,
  -- Dernière tentative (réussie ou non) : au plus une requête par mosquée et par jour.
  add column mawaqit_tente_le timestamptz,
  add column mawaqit_erreur text check (char_length(mawaqit_erreur) <= 300);
