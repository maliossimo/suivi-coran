-- =====================================================================
--  Nouveau rôle : responsable d'une mosquée (établissement). Il ne voit que
--  les présences et organise les classes ; aucun accès au suivi du Coran.
--  (Seul dans sa migration : une valeur d'enum ne peut pas servir dans la
--  transaction qui la crée.)
-- =====================================================================
alter type public.role_utilisateur add value if not exists 'responsable';
