#!/usr/bin/env bash
# check-reply.sh: read a whole chat reply on stdin and print every reason the
# Stop hook would refuse it. banned-constructions.sh and check-draft.sh both
# call this, so a reply is judged the same way before and after it is sent.
#
# Exit 0 either way. Stdout is empty when the reply is clean.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
text=$(cat)
[[ -n "$text" ]] || exit 0

# The Stop hook joins the text blocks of a turn with a form feed. The reply is
# the last block, since the app asks for a status line during a long turn.
last="${text##*$'\f'}"
text="${text//$'\f'/}"

hits=$("$here/check-constructions.sh" --hard <<<"$text")

# Every reply opens with a heading, so that the reader sees the shape of it
# before the prose. Only the opening line can be checked here: whether the
# rest of the content belongs under that heading is a judgement.
first=$(awk 'NF {print; exit}' <<<"$last")
if [[ -n "$first" && ! "$first" =~ ^\#\ (What\ I.ve\ done|What.s\ to\ discuss|⛔) ]]; then
  hits="The reply does not open on one of the 2 top level headings. Write
\"# What I've done\" for what is finished and needs no reply, and
\"# What's to discuss\" for what Nick has to decide. A reply with only open
points opens on the second one.
    1:$first
$hits"
fi

# Prose in a code block isn't rendered, so the reader sees the asterisks and
# backticks rather than the text. A fence without a language, or a fence
# tagged markdown, md, diff or text, is prose when it has bold or inline code
# in it.
raw=$(awk '
  /^[[:space:]]*```/ {
    if (fenced) { fenced = 0 }
    else { fenced = 1; prose = ($0 ~ /```[[:space:]]*(markdown|md|diff|text)?[[:space:]]*$/) }
    next
  }
  fenced && prose && (/\*\*[^*[:space:]][^*]*\*\*/ || /`[^`]+`/) { print "    " NR ":" $0 }
' <<<"$text" | head -3)
if [[ -n "$raw" ]]; then
  hits="Prose in a code block. Show it as a quote, so that it's rendered.
$raw
$hits"
fi

[[ -n "${hits// /}" ]] && printf '%s\n' "$hits"
exit 0
