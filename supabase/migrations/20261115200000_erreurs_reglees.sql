-- Erreurs réglées : l'admin retire du tableau une erreur dont le bug est corrigé.
-- Toutes les erreurs au même message (déjà reçues) sont marquées ; si le bug revient,
-- la nouvelle erreur s'affiche de nouveau.

alter table public.erreurs add column reglee_le timestamptz;

create or replace function public.marquer_erreur_reglee(p_message text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not est_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;
  update erreurs set reglee_le = now() where message = p_message and reglee_le is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.marquer_erreur_reglee(text) from public, anon;
grant execute on function public.marquer_erreur_reglee(text) to authenticated;
