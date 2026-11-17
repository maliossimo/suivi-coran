-- =====================================================================
--  Horaires de la mosquée : seules les heures des prières servent (elles règlent le ciel).
--  L'iqama et Joumou'a, ajoutées en 1.54.0 et jamais remplies, sont retirées.
-- =====================================================================

alter table public.horaires_priere
  drop constraint horaires_iqama_apres_adhan,
  drop column iqama_fajr,
  drop column iqama_dhuhr,
  drop column iqama_asr,
  drop column iqama_maghrib,
  drop column iqama_isha;

alter table public.etablissements
  drop column jumua;
