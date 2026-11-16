-- =====================================================================
--  « Mon compte » de l'élève : le nom de ses classes et de leurs Cheikhs.
--  L'élève ne lit pas la table des classes (réservée à ceux qui les gèrent) :
--  cette fonction ne lui donne que le nom de ses classes en cours et des Cheikhs
--  qui les suivent, rien d'autre (ni les autres élèves, ni les appels).
-- =====================================================================
create or replace function public.mes_classes()
returns table (classe text, cheikhs text)
language sql stable security definer set search_path = public as $$
  select c.nom,
         coalesce(
           string_agg(nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''), ', '
                      order by p.prenom, p.nom),
           '')
    from membres_classe m
    join classes c on c.id = m.classe_id and not c.archivee
    left join classes_cheikhs cc on cc.classe_id = c.id
    left join profils p on p.id = cc.maitre_id
   where m.eleve_id = auth.uid() and m.actif
   group by c.id, c.nom
   order by c.nom;
$$;

revoke all on function public.mes_classes() from public, anon;
grant execute on function public.mes_classes() to authenticated;
