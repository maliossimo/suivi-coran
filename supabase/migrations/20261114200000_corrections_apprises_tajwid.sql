-- =====================================================================
--  Corrections apprises de la vérification tajwid : une remarque signalée « L'appli s'est trompée »
--  n'est plus faite sur ce mot (même lecture, sourate, verset, mot et règle) quand le signalement vient
--  d'un Cheikh ou de l'admin, ou de deux élèves différents. L'admin peut refuser une correction apprise.
--  Aucun nom n'est exposé : seulement le mot et la règle.
-- =====================================================================

create table public.corrections_tajwid_refusees (
  lecture  public.lecture not null,
  sourate  smallint not null check (sourate between 1 and 114),
  verset   smallint not null check (verset between 1 and 286),
  mot      text not null check (char_length(mot) between 1 and 60),
  regle    text not null check (char_length(regle) between 1 and 60),
  par      uuid default auth.uid() references public.profils (id) on delete set null,
  cree_le  timestamptz not null default now(),
  primary key (lecture, sourate, verset, mot, regle)
);

alter table public.corrections_tajwid_refusees enable row level security;

create policy corrections_tajwid_refusees_lire on public.corrections_tajwid_refusees
  for select to authenticated using (est_admin());
create policy corrections_tajwid_refusees_ajouter on public.corrections_tajwid_refusees
  for insert to authenticated with check (est_admin() and par = auth.uid());
create policy corrections_tajwid_refusees_retirer on public.corrections_tajwid_refusees
  for delete to authenticated using (est_admin());

-- Toutes les corrections apprises (sans les refusées), avec leur nombre de signalements.
create or replace function public._corrections_tajwid()
returns table (lecture public.lecture, sourate smallint, verset smallint, mot text, regle text,
               signalements bigint, refusee boolean)
language sql stable security definer set search_path = public as $$
  with lignes as (
    select s.lecture, s.sourate, s.verset, s.mot, split_part(r, ':', 1) as regle, s.auteur_id, p.role
    from signalements_tajwid s
    cross join lateral unnest(s.regles) as r
    join profils p on p.id = s.auteur_id
    where p.actif
  )
  select l.lecture, l.sourate, l.verset, l.mot, l.regle, count(*),
         exists (select 1 from corrections_tajwid_refusees x
                 where (x.lecture, x.sourate, x.verset, x.mot, x.regle) = (l.lecture, l.sourate, l.verset, l.mot, l.regle))
  from lignes l
  group by l.lecture, l.sourate, l.verset, l.mot, l.regle
  having bool_or(l.role in ('admin', 'maitre')) or count(distinct l.auteur_id) >= 2;
$$;
revoke all on function public._corrections_tajwid() from public, anon, authenticated;

-- Pour la vérification : les corrections apprises d'un passage (au plus 41 versets).
create or replace function public.corrections_tajwid(p_lecture public.lecture, p_sourate int, p_du int, p_au int)
returns table (verset smallint, mot text, regle text)
language sql stable security definer set search_path = public as $$
  select c.verset, c.mot, c.regle
  from _corrections_tajwid() c
  where auth.uid() is not null
    and p_au - p_du between 0 and 40
    and c.lecture = p_lecture and c.sourate = p_sourate and c.verset between p_du and p_au
    and not c.refusee;
$$;
revoke all on function public.corrections_tajwid(public.lecture, int, int, int) from public, anon;
grant execute on function public.corrections_tajwid(public.lecture, int, int, int) to authenticated;

-- Pour l'admin : toutes, refusées comprises.
create or replace function public.corrections_tajwid_admin()
returns table (lecture public.lecture, sourate smallint, verset smallint, mot text, regle text,
               signalements bigint, refusee boolean)
language sql stable security definer set search_path = public as $$
  select * from _corrections_tajwid() where est_admin() order by sourate, verset, mot, regle;
$$;
revoke all on function public.corrections_tajwid_admin() from public, anon;
grant execute on function public.corrections_tajwid_admin() to authenticated;
