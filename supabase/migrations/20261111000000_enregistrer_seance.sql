-- =====================================================================
--  Enregistrement atomique d'une séance et de ses passages.
--
--  Une seule transaction : la séance (créée ou mise à jour) et la liste
--  complète de ses passages (remplacée). SECURITY INVOKER : les règles RLS
--  s'appliquent exactement comme pour un INSERT/UPDATE direct.
--
--  p_passages : tableau JSON
--    [{"sourateDebut":67,"versetDebut":1,"sourateFin":67,"versetFin":15}, …]
-- =====================================================================
create or replace function public.enregistrer_seance(
  p_date      date,
  p_type      public.type_seance,
  p_duree     smallint,
  p_tajwid    text,
  p_note      text,
  p_passages  jsonb,
  p_eleve     uuid default auth.uid()
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(coalesce(p_passages, '[]'::jsonb)) <> 'array' then
    raise exception 'Passages invalides' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_array_length(coalesce(p_passages, '[]'::jsonb)) > 20 then
    raise exception 'Trop de passages (20 au maximum)' using errcode = 'invalid_parameter_value';
  end if;

  insert into seances (eleve_id, date, type, duree_min, tajwid, note_libre)
  values (p_eleve, p_date, p_type, p_duree, nullif(trim(p_tajwid), ''), nullif(trim(p_note), ''))
  on conflict (eleve_id, date, type) do update
    set duree_min  = excluded.duree_min,
        tajwid     = excluded.tajwid,
        note_libre = excluded.note_libre
  returning id into v_id;

  delete from passages where seance_id = v_id;

  insert into passages (seance_id, ordre, sourate_debut, verset_debut, sourate_fin, verset_fin)
  select v_id,
         p.ordre::smallint,
         (p.valeur->>'sourateDebut')::smallint,
         (p.valeur->>'versetDebut')::smallint,
         (p.valeur->>'sourateFin')::smallint,
         (p.valeur->>'versetFin')::smallint
  from jsonb_array_elements(coalesce(p_passages, '[]'::jsonb)) with ordinality as p(valeur, ordre);

  return v_id;
end $$;

revoke all on function public.enregistrer_seance(date, public.type_seance, smallint, text, text, jsonb, uuid) from public, anon;
grant execute on function public.enregistrer_seance(date, public.type_seance, smallint, text, text, jsonb, uuid) to authenticated;
