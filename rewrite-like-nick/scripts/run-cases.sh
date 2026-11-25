#!/usr/bin/env bash
# run-cases.sh: check every test sentence against the constructions.
#
# A regex that stops a false positive usually stops a real hit as well, so a
# change to banned-constructions.txt is checked here before it goes live.
# A sentence marked BAD has to be caught by at least one construction, and a
# sentence marked GOOD by none of them.
#
# Exits 1 when a case fails, so it can gate a commit or a CI job.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cases="${1:-$here/banned-constructions.cases.txt}"
[[ -r "$cases" ]] || { echo "no cases file at $cases" >&2; exit 2; }

failing=0
total=0
while IFS='|' read -r want sentence; do
  case "$want" in BAD|GOOD) ;; *) continue ;; esac
  total=$((total + 1))
  hits=$(printf '%s\n' "$sentence" |
    "$here/check-constructions.sh" --all)
  got=$([[ -n "$hits" ]] && echo BAD || echo GOOD)
  [[ "$got" == "$want" ]] && continue
  failing=$((failing + 1))
  printf 'FAIL want=%-4s got=%-4s %s\n' "$want" "$got" "$sentence"
  # Which construction fired tells you what to change.
  [[ -n "$hits" ]] && head -1 <<<"$hits" | sed 's/^/     /'
done < "$cases"

printf '%d cases, %d failing\n' "$total" "$failing"
[[ "$failing" -eq 0 ]]
