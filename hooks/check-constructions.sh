#!/usr/bin/env bash
# check-constructions.sh: read prose on stdin, print the constructions it
# breaks. Every hook that checks writing calls this, so there is one list of
# rules and one way of reading them.
#
# Exit 0 with nothing on stdout when the prose is clean, and 0 with the hits
# on stdout when it isn't. The caller decides what to do about them.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rules="$here/banned-constructions.txt"
allow="$here/banned-constructions.allow"
soft="$here/banned-constructions.soft"
[[ -r "$rules" ]] || exit 0

# --hard prints only the constructions that the Stop hook refuses a reply for.
# --soft prints only the ones listed in banned-constructions.soft. Without a
# flag every hit is printed, which is what a written file is checked against.
mode="all"
case "${1:-}" in --hard) mode="hard" ;; --soft) mode="soft" ;; esac

# Only prose is checked. A fenced block, an inline span and a quoted line hold
# code, a path or somebody else's words, and the rules are not about any of
# those. A "Bad:" or "Before:" line is the same case: it quotes a construction
# to name it, which is how a rule and a correction are written.
text=$(awk '
  # A fence tagged markdown contains prose somebody is about to post, such as
  # a draft MR description shown for approval, so it is checked like the reply.
  /^[[:space:]]*```/ {
    if (fenced) { fenced = 0; draft = 0 }
    else { fenced = 1; draft = ($0 ~ /```[[:space:]]*(markdown|md)[[:space:]]*$/) }
    next
  }
  fenced && !draft { next }
  /^[[:space:]]*>/ { next }
  # A Bad example runs to its Good counterpart, so the whole of it is skipped,
  # however many lines it wraps over.
  /^[[:space:]]*(\*\*)?(Bad|Before)(:|\*\*:)/ { bad = 1; next }
  bad && /^[[:space:]]*(\*\*)?(Good|After)(:|\*\*:)/ { bad = 0; next }
  bad && /^[[:space:]]*(##|- \*\*|[0-9]+\. )/ { bad = 0 }
  bad { next }
  { gsub(/`[^`]*`/, " "); print }
')
[[ -n "$text" ]] || exit 0

# A sentence a person has approved as a false positive, one per line, matched
# whole. Only a person writes this file.
if [[ -r "$allow" ]]; then
  while IFS= read -r approved; do
    [[ -n "${approved// }" ]] || continue
    [[ "${approved:0:1}" == "#" ]] && continue
    # -e, because an approved line starting with "-" is a pattern, never an
    # option: without it grep fails, the || true hides it, and every rule is
    # switched off for the rest of the text.
    text=$(grep -vxF -e "$approved" <<<"$text" || true)
  done < "$allow"
fi
[[ -n "$text" ]] || exit 0

# Each line of the rules file is name@@regex@@exemption, the exemption
# optional. A regex is full of "|", so the fields are split by hand.
while IFS= read -r entry; do
  [[ -n "${entry// }" ]] || continue
  [[ "${entry:0:1}" == "#" ]] && continue
  name="${entry%%@@*}"
  if [[ "$mode" != all && -r "$soft" ]]; then
    if grep -qxF -- "${name%%. *}" "$soft"; then
      [[ "$mode" == hard ]] && continue
    else
      [[ "$mode" == soft ]] && continue
    fi
  fi
  rest="${entry#*@@}"
  regex="${rest%%@@*}"
  exempt=""
  [[ "$rest" != "$regex" ]] && exempt="${rest#*@@}"
  # A regex prefixed with (?cs) is matched case sensitively: grep -i makes
  # [A-Z] match any letter, so a proper-noun branch needs the flag off.
  flags="-niE"
  if [[ "$regex" == '(?cs)'* ]]; then
    regex="${regex#(\?cs)}"
    flags="-nE"
  fi
  found=$(grep $flags "$regex" <<<"$text")
  # The exemption is matched against the line itself, with the line number
  # grep prefixed stripped off, so an exemption can anchor on ^.
  if [[ -n "$found" && -n "$exempt" ]]; then
    found=$(while IFS= read -r hit; do
              grep -qiE "$exempt" <<<"${hit#*:}" || printf '%s\n' "$hit"
            done <<<"$found")
  fi
  found=$(head -3 <<<"$found")
  [[ -n "$found" ]] || continue
  printf '%s\n' "$name"
  while IFS= read -r line; do printf '    %s\n' "$line"; done <<<"$found"
done < "$rules"
