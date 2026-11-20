#!/usr/bin/env bash
# Après chaque mise en production (PR main → prod fusionnée en « squash »), rattache l'historique de
# prod à main : sans cela, la PR suivante main → prod affiche un conflit alors que les contenus sont les mêmes.
# Le contenu de main ne change pas (fusion « ours ») ; la PR créée se fusionne avec
# « Create a merge commit » (jamais en squash, qui perdrait le rattachement).
#
# Usage : scripts/synchroniser-prod.sh
set -euo pipefail

# Références à jour (un simple « git fetch » peut laisser d'anciennes copies locales).
git fetch origin '+refs/heads/main:refs/remotes/origin/main' '+refs/heads/prod:refs/remotes/origin/prod'

if git merge-base --is-ancestor origin/prod origin/main; then
  echo "main contient déjà tout prod : rien à synchroniser."
  exit 0
fi

branche="chore/synchronise-prod-$(date +%Y%m%d%H%M)"
git checkout -B "$branche" origin/main
git merge --no-edit -s ours origin/prod -m "Synchronise prod dans main (fusion squash)"

# Le contenu doit rester celui de main.
if ! git diff --quiet origin/main HEAD; then
  echo "Le contenu a changé : arrêt." >&2
  exit 1
fi

git push -u origin "$branche"
# Dépôt lu dans l'adresse du remote (« gh repo view » passe par GraphQL, parfois indisponible).
depot="$(git remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')"
gh api "repos/$depot/pulls" -f title="Synchronise prod dans main" -f head="$branche" -f base=main \
  -f body="Rattache l'historique de prod à main (fusion squash précédente), sans changer le contenu de main. À fusionner avec « Create a merge commit »." \
  --jq '.html_url'
echo "Fusionne cette PR avec « Create a merge commit », puis ouvre la PR main → prod."
