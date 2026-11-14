-- =====================================================================
--  Index pour les lectures fréquentes qui n'en avaient pas :
--  - statistiques de toutes les séances d'une période (tableau de bord, classe du mois) ;
--  - journal filtré par la personne qui a agi ;
--  - commentaires d'un auteur (suppression d'un Cheikh) ;
--  - passages écoutés / validés par un Cheikh (suppression d'un Cheikh).
-- =====================================================================

create index if not exists seances_date on public.seances (date);
create index if not exists journal_audit_acteur_quand on public.journal_audit (acteur_id, quand desc);
create index if not exists commentaires_auteur on public.commentaires (auteur_id);
create index if not exists passages_corrige_par on public.passages (corrige_par) where corrige_par is not null;
create index if not exists passages_valide_par on public.passages (valide_par) where valide_par is not null;
