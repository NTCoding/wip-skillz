#!/usr/bin/env bash
# check-prose.sh [file] runs every prose check on one text.
# The text is read from the file, or from standard input without a readable file.
# Each hit is printed under the name of the rule that found the hit.
# The exit status is 1 after a hit from a check that blocks.
# The command scratch-pad check runs check-prose.sh through SCRATCH_PAD_PROSE_CHECK.
# That command reads only standard output. The warnings go there too.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
text=$(if [[ -n "${1:-}" && -r "$1" ]]; then cat "$1"; else cat; fi)
[[ -n "$text" ]] || exit 0

status=0
blocking() {
  local out
  out=$("$@" <<<"$text")
  [[ -n "${out// /}" ]] || return 0
  printf '%s\n' "$out"
  status=1
}
warning() {
  local out
  out=$("$@" <<<"$text")
  [[ -n "${out// /}" ]] || return 0
  printf 'WARNING: never blocks. Decide on each one.\n%s\n' "$out"
}

blocking "$here/check-constructions.sh"
blocking "$here/check-code-block-prose.sh"
blocking "$here/check-tells.sh"
blocking "$here/check-before-after.sh"
warning "$here/check-constructions.sh" --warn
warning "$here/check-references.sh"
exit "$status"
