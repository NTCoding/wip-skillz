#!/usr/bin/env bash
# check-references.sh [file]. Reads standard input when no file is passed.
# Prints each sentence that points at a line or a step of a file
# without the content straight after it.
set -uo pipefail
awk '
function fence(s,   n) {
  if (!match(s, /^[[:space:]]*`+/) || RLENGTH < 3) return 0
  n = RLENGTH
  if (!fenced) { fenced = 1; flen = n; return 1 }
  if (n >= flen && s ~ /^[[:space:]]*`+[[:space:]]*$/) fenced = 0
  return 1
}
fence($0) { pending = ""; next }
fenced { next }
/^:::decision/ { decision = 1; next }
decision { if (/^:::$/) decision = 0; next }
NF == 0 { next }
pending != "" && /^[[:space:]]*(>|!\[|#+ .*⬅️ Before)/ {
  pending = ""; next
}
pending != "" { print pending; pending = "" }
/^[[:space:]]*(>|\||#|:::)/ { next }
{
  s = $0
  gsub(/\[[^]]*\]\([^)]*\)/, " ", s)
  gsub(/`[^`]*`/, " ", s)
  file_line = "[A-Za-z0-9_.-]+[.](md|mjs|js|ts|css|sh):[0-9]+"
  line_word = "(^|[^A-Za-z])([Ll]ines?|[Ss]teps?) [0-9]+"
  if (s ~ file_line || s ~ line_word)
    pending = NR ": " substr($0, 1, 60) "…"
}
END { if (pending != "") print pending }
' "${1:--}"
