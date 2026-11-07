#!/usr/bin/env bash
# banned-constructions.sh: refuse to end a turn whose reply breaks one of the
# writing rules. The checks are in check-reply.sh, which check-draft.sh runs
# on a draft as well, so a reply is judged the same way before it is sent.
#
# The output style already names these constructions. An agent with every
# rule in its context still writes them, because it never reads its own text
# back. banned-constructions.sh reads it instead.
#
# Stop contract: exit 0 with an empty stdout lets the session stop. A JSON
# object with "decision": "block" hands "reason" back to the agent.
set -uo pipefail
command -v jq >/dev/null 2>&1 || exit 0
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

payload=$(cat)
session=$(jq -r '.session_id // empty' <<<"$payload")
transcript=$(jq -r '.transcript_path // empty' <<<"$payload")
[[ -n "$session" && -r "$transcript" ]] || exit 0

# The turn that is ending: everything after the last real user message. A tool
# result is also a "user" entry, so it is filtered out.
turn_entries='
  [ .[] | select(.type=="user" or .type=="assistant") ] as $t
  | ( [ $t | to_entries[]
        | select(.value.type=="user"
                 and ( (.value.message.content | type) == "string"
                       or ( [ .value.message.content[]? | select(.type=="tool_result") ] | length ) == 0 ))
        | .key ] | last ) as $i
  | $t[(($i // -1) + 1):]'
# The blocks are joined with a form feed, so that check-reply.sh can tell the
# final reply from the status lines the app asks for during a long turn.
text=$(jq -s "$turn_entries"' | map(select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text) | join("\n\f\n")' "$transcript" 2>/dev/null | jq -r '.')
[[ -n "$text" && "$text" != "null" ]] || exit 0
last="${text##*$'\f'}"

hits=$("$here/check-reply.sh" <<<"$text")
text="${text//$'\f'/}"

# A claim that a check passed, or that a merge request can be merged, needs the
# command it is proved by in the same turn. Nick read "green" and "ready to
# merge" in replies that had run neither, so the tools of the turn are listed.
tools=$(jq -s "$turn_entries"' | map(select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | (.name + " " + ((.input.command // "") | tostring))) | join("\n")' "$transcript" 2>/dev/null | jq -r '.')
prose=$(awk '/^[[:space:]]*```/ { fenced = !fenced; next } fenced { next } /^[[:space:]]*>/ { next } { print }' <<<"$text")
claim=$(grep -niE '\b(tests?|verify|pipeline|lint|typecheck|build|coverage|gates?)\s+(pass|passes|passed|(is|are|went|came back) (green|clean))\b' <<<"$prose" | head -3)
if [[ -n "$claim" ]] && ! grep -q '^Bash ' <<<"$tools"; then
  hits="A check is said to pass, without any command run in this turn. Run it and show the output.
$(sed 's/^/    /' <<<"$claim")
$hits"
fi
merge=$(grep -niE '\b(ready to merge|can be merged|is mergeable|has been merged|is merged|got merged)\b' <<<"$prose" | head -3)
if [[ -n "$merge" ]] && ! grep -qE '^Bash .*glab mr (view|list)' <<<"$tools"; then
  hits="The merge state is claimed without glab mr view in this turn. Run it and show the output.
$(sed 's/^/    /' <<<"$merge")
$hits"
fi

[[ -n "${hits// /}" ]] || exit 0

# A correction can break the same rule again, so banned-constructions.sh only
# fires on text it hasn't blocked before. The fingerprint stops a loop on the
# same text. The cap stops a loop of rewrites that keep failing. The cap counts
# per message from Nick rather than per session, because a cap per session
# switched the check off for good once a long session had used it up. Stop
# hook feedback is stored as a user message with isMeta set, so it doesn't
# count as a new message from Nick.
turn=$(jq -rs '
  [ .[] | select(.type=="user" and (.isMeta != true)
                 and ( (.message.content | type) == "string"
                       or ( [ .message.content[]? | select(.type=="tool_result") ] | length ) == 0 )) ]
  | last | .uuid // "none"
' "$transcript" 2>/dev/null)
marker_dir="${TMPDIR:-/tmp}/banned-constructions/$session/${turn:-none}"
mkdir -p "$marker_dir" || exit 0
[[ $(find "$marker_dir" -type f | wc -l) -ge 10 ]] && exit 0
fingerprint=$(shasum <<<"$text" | cut -d' ' -f1)
[[ -e "$marker_dir/$fingerprint" ]] && exit 0
: > "$marker_dir/$fingerprint"

# check-draft.sh fingerprints a draft it passed, so the reason can say whether
# this reply was checked before it was sent.
checked="${TMPDIR:-/tmp}/banned-constructions/checked/$(tr -s '[:space:]' ' ' <<<"$last" | sed 's/^ //;s/ $//' | shasum | cut -d' ' -f1)"
if [[ -e "$checked" ]]; then
  note="check-draft.sh passed this text. The hits above come from the transcript, which only the Stop hook can read."
else
  note="This reply wasn't run through ~/.claude/hooks/check-draft.sh before it was sent."
fi

# The reply is already on screen when this runs, so the banner is what tells
# the reader which one to skip: one in the feedback block plus one the rewrite
# has to open with.
banner='████████████████████████████████████████████████████████
█  THE REPLY ABOVE IS REJECTED. DO NOT READ IT.
████████████████████████████████████████████████████████'

jq -n --arg hits "$hits" --arg banner "$banner" --arg note "$note" '{
  decision: "block",
  reason: ($banner
    + "\n\nIt breaks the output style.\n\n"
    + $hits
    + "\n\n" + $note
    + "\n\nRewrite the whole reply. Feed the rewrite to ~/.claude/hooks/check-draft.sh through a heredoc first, fix every BLOCKING hit, then send it. Open it with this line, on its own, before anything else:\n\n"
    + "# ⛔ THE REPLY ABOVE IS REJECTED. READ THIS ONE INSTEAD.\n\n"
    + "If one of these is a false positive, rewrite it another way that is valid. Propose it for the allow list only when no valid rewrite exists, and say so in Input needed from you: a person writes that file.")
}'
