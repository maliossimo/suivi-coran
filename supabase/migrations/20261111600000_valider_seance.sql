-- =====================================================================
--  Validation d'une séance en un geste par le Cheikh (ou l'admin) :
--  tous les passages sont marqués « vus » et la séance « corrigée »,
--  sans rien modifier d'autre.
-- =====================================================================
create or replace function public.valider_seance(p_seance uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_eleve uuid;
begin
  select eleve_id into v_eleve from seances where id = p_seance;
  if v_eleve is null or not encadre(v_eleve) then
    raise exception 'Validation réservée au Cheikh de l''élève' using errcode = 'insufficient_privilege';
  end if;

  -- Le trigger marquer_correction_passage pose la marque de l'encadrant.
  update passages set ordre = ordre where seance_id = p_seance;
  -- Le trigger tracer_modif renseigne modifiee_par / modifiee_le.
  update seances set duree_min = duree_min where id = p_seance;
end $$;

revoke all on function public.valider_seance(uuid) from public, anon;
grant execute on function public.valider_seance(uuid) to authenticated;
