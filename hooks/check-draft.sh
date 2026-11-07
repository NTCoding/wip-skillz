#!/usr/bin/env bash
# check-draft.sh: read a draft reply on stdin and print what the Stop hook
# would refuse, so that the agent fixes the text before Nick sees it.
#
# Under BLOCKING are the hits that make the Stop hook refuse a reply. Under
# SOFT are the constructions listed in banned-constructions.soft, which the
# Stop hook lets through: fix each one that has a valid rewrite.
#
# A draft without a blocking hit is fingerprinted, so that the Stop hook can
# say whether the reply it refuses was checked here first.
#
# Exit 1 when there is a blocking hit, 0 otherwise.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
text=$(cat)
[[ -n "$text" ]] || exit 0

blocking=$("$here/check-reply.sh" <<<"$text")
soft=$("$here/check-constructions.sh" --soft <<<"$text")

if [[ -n "${blocking// /}" ]]; then
  printf 'BLOCKING: the Stop hook refuses a reply with these.\n\n%s\n' "$blocking"
fi
if [[ -n "${soft// /}" ]]; then
  [[ -n "${blocking// /}" ]] && echo
  printf 'SOFT: the Stop hook lets these through. Fix each one that has a valid rewrite.\n\n%s\n' "$soft"
fi
[[ -n "${blocking// /}" ]] && exit 1

dir="${TMPDIR:-/tmp}/banned-constructions/checked"
mkdir -p "$dir" && find "$dir" -type f -mmin +1440 -delete 2>/dev/null
: > "$dir/$(tr -s '[:space:]' ' ' <<<"$text" | sed 's/^ //;s/ $//' | shasum | cut -d' ' -f1)"
[[ -z "${soft// /}" ]] && echo "CLEAN"
exit 0
