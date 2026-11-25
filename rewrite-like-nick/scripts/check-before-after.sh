#!/usr/bin/env bash
# check-before-after.sh [file]. Reads standard input when no file is passed.
# Prints each Before and After pair that doesn't show 2 versions
# of the same file.
set -uo pipefail
awk '
function fence(s,   n) {
  if (!match(s, /^[[:space:]]*`+/) || RLENGTH < 3) return 0
  n = RLENGTH
  if (!fenced) { fenced = 1; flen = n; return 1 }
  if (n >= flen && s ~ /^[[:space:]]*`+[[:space:]]*$/) fenced = 0
  return 1
}
function paths(s,   out, m, re) {
  re = "[A-Za-z0-9_.-]+[.][a-z][a-z0-9]{0,4}([:, `\"]|$)"
  out = ""
  while (match(s, re)) {
    m = substr(s, RSTART, RLENGTH)
    sub(/[:, `"]$/, "", m)
    out = out " " m
    s = substr(s, RSTART + RLENGTH)
  }
  return out
}
function close_after() {
  if (kind != "after") return
  if (!(bimage && aimage)) {
    if (bfile == "")
      printf "%s\n  the Before doesn\047t show a file\n", head
    else if (index(afiles " ", " " bfile " ") == 0)
      printf "%s\n  the After doesn\047t show %s\n", head, bfile
  }
}
fence($0) { next }
!fenced && /^#+ .*⬅️ Before/ {
  close_after(); kind = "before"; bfile = ""; bimage = 0; next
}
!fenced && /^#+ .*➡️ After/ {
  close_after(); kind = "after"; afiles = ""; aimage = 0
  head = NR ": " substr($0, index($0, "After"), 60)
  next
}
!fenced && /^#+ / {
  close_after(); kind = (kind == "before" ? "between" : ""); next
}
kind == "before" && /!\[/ { bimage = 1 }
kind == "before" && bfile == "" && (fenced || /^>/) {
  split(paths($0), f, " "); bfile = f[1]
}
kind == "after" && /!\[/ { aimage = 1 }
kind == "after" && (fenced || /^>/) { afiles = afiles paths($0) }
END { close_after() }
' "${1:--}"
