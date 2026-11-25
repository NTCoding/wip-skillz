#!/usr/bin/env bash
# check-code-block-prose.sh [file] reads the file or standard input.
# It prints each line of bold text or inline code inside a prose fence.
# The awk pattern below lists the fence languages that are prose.
# Bold text and inline code are shown as raw characters in a fence.
set -uo pipefail
awk '
  /^[[:space:]]*```/ {
    if (fenced) { fenced = 0 }
    else { fenced = 1
      prose = ($0 ~ /```[[:space:]]*(markdown|md|diff|text)?[[:space:]]*$/) }
    next
  }
  fenced && prose && (/\*\*[^*[:space:]][^*]*\*\*/ || /`[^`]+`/) {
    print "    " NR ":" $0 }
' "${1:--}"
