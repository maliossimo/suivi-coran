#!/usr/bin/env bash
# PR main → prod : répond « oui » si la tête de main est EXACTEMENT un contenu déjà vérifié sur sa PR vers main.
# Condition : la tête de main est la fusion « squash » d'une PR dont la CI et les tests de bout en bout ont réussi
# sur la même base que celle où elle a été fusionnée (statuts « Contenu vérifié » posés par ces vérifications).
# Même base + même tête = même contenu : relancer les mêmes tests n'apprendrait rien. Sinon : « non », tout tourne.
# Usage : R=propriétaire/dépôt GH_TOKEN=… scripts/deja-verifie.sh <sha de la tête de main>
set -uo pipefail
tete="$1"
non() {
  echo "Vérifications complètes : $1" >&2
  echo non
  exit 0
}

pr=$(gh api "repos/$R/commits/$tete/pulls" \
  --jq "[.[] | select(.merged_at != null and .base.ref == \"main\" and .merge_commit_sha == \"$tete\")][0] // empty") ||
  non "lecture des PR impossible"
[ -n "$pr" ] || non "la tête de main ne vient pas directement d'une PR fusionnée"
tete_pr=$(jq -r .head.sha <<<"$pr")

parents=$(gh api "repos/$R/commits/$tete" --jq '[.parents[].sha] | join(" ")') || non "lecture du commit impossible"
[ "$(wc -w <<<"$parents")" -eq 1 ] || non "la tête de main n'est pas une fusion « squash »"

for contexte in "Contenu vérifié (CI)" "Contenu vérifié (bout en bout)"; do
  base=$(gh api "repos/$R/commits/$tete_pr/statuses?per_page=100" \
    --jq "[.[] | select(.context == \"$contexte\")][0] | select(.state == \"success\") | .description // empty") ||
    non "lecture des statuts impossible"
  [ "$base" = "$parents" ] || non "« $contexte » absent, ou vérifié sur une autre base que celle de la fusion"
done
echo "Contenu déjà vérifié sur la PR #$(jq -r .number <<<"$pr") (même base, même tête)." >&2
echo oui
