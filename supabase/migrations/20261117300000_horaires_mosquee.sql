-- =====================================================================
--  Horaires de prière de la mosquée, importés de son calendrier (Mawaqit) : le ciel de la
--  barre du haut suit les vraies heures fixées par l'imam. Calendrier d'une année type
--  (mois, jour), en minutes depuis minuit, heure de Paris. Sans calendrier : calcul.
--  Lecture : chacun pour son établissement ; écriture : l'admin seul.
-- =====================================================================

create table public.horaires_priere (
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  mois     smallint not null check (mois between 1 and 12),
  jour     smallint not null check (jour between 1 and 31),
  fajr     smallint not null check (fajr between 0 and 1439),
  chourouq smallint not null check (chourouq between 0 and 1439),
  dhuhr    smallint not null check (dhuhr between 0 and 1439),
  asr      smallint not null check (asr between 0 and 1439),
  maghrib  smallint not null check (maghrib between 0 and 1439),
  isha     smallint not null check (isha between 0 and 1439),
  importe_le timestamptz not null default now(),
  primary key (etablissement_id, mois, jour),
  check (fajr < chourouq and chourouq < dhuhr and dhuhr < asr and asr < maghrib and maghrib < isha)
);

alter table public.horaires_priere enable row level security;

create policy horaires_lecture on public.horaires_priere for select to authenticated
  using (est_admin() or etablissement_id = (select etablissement_id from public.profils where id = auth.uid()));
create policy horaires_admin on public.horaires_priere for all to authenticated
  using (est_admin()) with check (est_admin());

-- Adresse Mawaqit de la mosquée (ex. « mosquee-de-lieusaint ») : d'où vient le calendrier.
alter table public.etablissements
  add column mawaqit text check (mawaqit ~ '^[a-z0-9-]{1,160}$');
