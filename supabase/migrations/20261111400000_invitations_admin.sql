-- L'admin peut créer un QR code d'inscription pour n'importe quel établissement.
drop policy invitations_creation on public.invitations_classe;

create policy invitations_creation on public.invitations_classe for insert
  with check (
    cree_par = auth.uid()
    and utilisations = 0
    and (
      est_admin()
      or (mon_role() = 'maitre' and etablissement_id = (select etablissement_id from profils where id = auth.uid()))
    )
  );
