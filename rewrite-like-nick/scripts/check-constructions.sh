#!/usr/bin/env bash
# check-constructions.sh: read prose on stdin, print the constructions it
# breaks. Every hook that checks writing calls this, so there is one list of
# rules and one way of reading them.
#
# Usage: check-constructions.sh [--hard|--soft|--warn|--all] [file]
# The prose is the file when one is passed, or standard input.
#
# Exit 0 with nothing on stdout when the prose is clean, and 0 with the hits
# on stdout when it isn't. Every hit is printed: a hook that wants a shorter
# message caps the output itself. The caller decides what to do about them.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rules="$here/banned-constructions.txt"
allow="$here/banned-constructions.allow"
private="$HOME/.claude/hooks/banned-constructions.private.txt"
soft="$here/banned-constructions.soft"
warn="$here/banned-constructions.warn"
[[ -r "$rules" ]] || exit 0

# --hard prints only the constructions that the Stop hook refuses a reply for.
# --soft prints only the ones listed in banned-constructions.soft. Without a
# flag every hit is printed, which is what a written file is checked against.
# A rule in banned-constructions.warn only warns.
# Every mode skips it, except --warn (only the warnings)
# and --all (every rule).
mode="block"
case "${1:-}" in
  --hard) mode="hard" ;; --soft) mode="soft" ;;
  --warn) mode="warn" ;; --all) mode="all" ;;
esac
[[ "${1:-}" == --* ]] && shift

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
  {
    gsub(/`[^`]*`/, " ")
    gsub(/\(data:[^)]*\)/, "( )")
    print
  }
' "$@")
[[ -n "$text" ]] || exit 0

# A sentence a person has approved as a false positive, one per line, matched
# whole. Only a person writes this file.
for list in "$allow" "$HOME/.claude/hooks/banned-constructions.allow"; do
  [[ -r "$list" ]] || continue
  while IFS= read -r approved; do
    [[ -n "${approved// }" ]] || continue
    [[ "${approved:0:1}" == "#" ]] && continue
    # -e, because an approved line starting with "-" is a pattern, never an
    # option: without it grep fails, the || true hides it, and every rule is
    # switched off for the rest of the text.
    text=$(grep -vxF -e "$approved" <<<"$text" || true)
  done < "$list"
done
[[ -n "$text" ]] || exit 0

# Each line of the rules file is name@@regex@@exemption, the exemption
# optional. A regex is full of "|", so the fields are split by hand. A private
# rules file in the same format is read too.
while IFS= read -r entry; do
  [[ -n "${entry// }" ]] || continue
  [[ "${entry:0:1}" == "#" ]] && continue
  name="${entry%%@@*}"
  short="${name%%. *}"
  if [[ -r "$warn" ]] && grep -qxF -- "$short" "$warn"; then
    [[ "$mode" == warn || "$mode" == all ]] || continue
  elif [[ "$mode" == warn ]]; then
    continue
  fi
  if [[ ! "$mode" =~ ^(block|all)$ && -r "$soft" ]]; then
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
  # A regex prefixed with (?pl) is matched by perl, because grep -E has no
  # lookahead and some rules have to look at what is missing from a clause.
  if [[ "$regex" == '(?pl)'* ]]; then
    found=$(PAT="${regex#(\?pl)}" perl -ne 'print "$.:$_" if /$ENV{PAT}/' <<<"$text")
  else
    found=$(grep $flags "$regex" <<<"$text")
  fi
  # The exemption is matched against the line itself, with the line number
  # grep prefixed stripped off, so an exemption can anchor on ^.
  if [[ -n "$found" && -n "$exempt" ]]; then
    found=$(while IFS= read -r hit; do
              grep -qiE "$exempt" <<<"${hit#*:}" || printf '%s\n' "$hit"
            done <<<"$found")
  fi
  [[ -n "$found" ]] || continue
  printf '%s\n' "$name"
  while IFS= read -r line; do printf '    %s\n' "$line"; done <<<"$found"
done < <(
  if [[ -r "$private" ]]; then
    # A private rule with the same short name as a rule in the rules file
    # replaces it, so a private rule can widen or narrow a public one.
    awk -F'@@' '
      function short(l,  n) { n = $1; sub(/\. .*/, "", n); return n }
      NR == FNR { if ($0 !~ /^#/ && $0 ~ /@@/) skip[short($0)] = 1; next }
      !(short($0) in skip) { print }
    ' "$private" "$rules"
    cat "$private"
  else
    cat "$rules"
  fi
)
