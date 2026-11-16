-- =====================================================================
--  Qui utilise le Coran : lectures, écoutes et récitations, par personne, par jour
--  et par sourate. Rien que des compteurs (jamais la voix) ; lus par l'admin seulement.
-- =====================================================================

create table public.usages_coran (
  personne_id uuid not null references public.profils(id) on delete cascade,
  jour        date not null default (now() at time zone 'Europe/Paris')::date,
  quoi        text not null check (quoi in ('lecture', 'ecoute', 'recitation')),
  sourate     smallint not null check (sourate between 1 and 114),
  nombre      integer not null default 1 check (nombre between 1 and 1000),
  dernier     timestamptz not null default now(),
  primary key (personne_id, jour, quoi, sourate)
);
create index usages_coran_jour on public.usages_coran (jour desc);

alter table public.usages_coran enable row level security;
-- Lecture : l'admin. L'écriture passe par noter_usage_coran (pour soi-même uniquement).
create policy usages_coran_admin on public.usages_coran for select to authenticated using (est_admin());

create or replace function public.noter_usage_coran(p_quoi text, p_sourate smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_quoi not in ('lecture', 'ecoute', 'recitation')
     or p_sourate is null or p_sourate not between 1 and 114 then
    return;
  end if;
  insert into usages_coran (personne_id, quoi, sourate)
  values (auth.uid(), p_quoi, p_sourate)
  on conflict (personne_id, jour, quoi, sourate)
  do update set nombre = least(usages_coran.nombre + 1, 1000), dernier = now();
end $$;
revoke all on function public.noter_usage_coran(text, smallint) from public, anon;
grant execute on function public.noter_usage_coran(text, smallint) to authenticated;
