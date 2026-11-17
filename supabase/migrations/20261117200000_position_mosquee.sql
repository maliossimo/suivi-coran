-- =====================================================================
--  Position de la mosquée (latitude, longitude) : le ciel de la barre du haut suit
--  les vraies heures de prière du lieu. Facultative (Paris en attendant) ; réglée par l'admin
--  (règle etab_admin existante) ; lue par chacun pour son établissement (etab_lecture).
-- =====================================================================

alter table public.etablissements
  add column latitude  double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add constraint etablissements_position_complete check ((latitude is null) = (longitude is null));
