---
name: nick-review
description: A first pass over a merge request, or a group of them, for Nick to read before he reviews. Trigger on "review !N", "review these MRs", "/nick-review <iid…>". It checks correctness against the spec, compliance with the repository's rules, and simplification. One subagent per merge request. It opens an HTML report and never posts anything to GitLab.
---

# nick-review

A first pass for Nick, on his own machine. It finds what he would find, so he
reads a short list instead of the whole diff.

It is not a review posted to the team. Nothing reaches GitLab from this skill.
The output is an HTML report Nick reads, types his responses into, and turns
into one block of markdown he pastes back into the session.

## What it checks

1. **Correctness against the spec.** The card the merge request cites.
2. **Compliance with the repository's rules.** Its agent instructions, its
   contributing guide, the architecture records the change touches, its coding
   conventions.
3. **Simplification.** Where the change could be smaller or plainer.
4. **The writing.** Every word a person reads, against Nick's grammar rules.
   A document, a code comment, a commit message, the merge request
   description. See *The grammar pass*.

`defects.md`, in this folder, is the list of what Nick catches. Read it before
you review anything. Then hunt for every class in it.

## The procedure

### 1. Resolve the merge requests

Take the iids from what Nick asked. Where he named none, list the open ones and
ask him which.

For each one, read the merge request, its description, its card, and the
discussion already on it. A comment prefixed `[claude]` is an agent's own
opinion, from this skill on an earlier run or from another session: read it,
never repeat it.

### 2. Fetch, without checking anything out

```sh
glab mr diff <iid>                               # the diff
git fetch origin merge-requests/<iid>/head       # its head, for reading files
```

Read a file at the merge request's head with `git show FETCH_HEAD:<path>`.
Nothing is checked out, so several merge requests are reviewed at once in one
working tree.

### 3. One subagent per merge request

Start them in a single message so they run at the same time. Each subagent gets
its own merge request and nothing else.

Give each subagent, in its prompt: the iid, the card and its acceptance
criteria, the paths of the repository's rules, the full text of `defects.md`,
and the finding schema below. Tell it to return the findings as JSON.

A subagent reads the code. It never edits a file, and it never posts a comment.

### 4. The bands

Every finding goes into one of 3 bands, and the band is a judgement about
certainty rather than about severity.

| Band | Name | What it means |
|---|---|---|
| 1 | Slam dunk | Obvious. The fix is right there. |
| 2 | You might want a look | The defect is certain. The fix might be wrong. |
| 3 | Needs you first | It cannot be settled from the diff, so it asks Nick a question. |

**Band 2 is agreed unless Nick rejects it.** A band 2 finding he leaves alone
is one he was happy with, so it is absent from his feedback and it still counts
as agreed. Put a finding in band 2 only when you would be comfortable with
that.

Band 3 is the only band where a finding carries a `question`, and every band 3
finding has one.

### 5. The grammar pass

Every word a person reads is written text, and it follows Nick's rules whether
it is a paragraph of a readme or one code comment. A merge request can be
nothing but grammar findings, and that is a real review rather than a thin one.

What counts: documents and readmes, architecture records, stories, code
comments and docstrings, log and error messages, test names, commit messages,
the merge request description. What is exempt: a quotation of somebody else's
words, a fenced block, a path, a symbol, and any text the change did not touch.

Run the mechanical check over the prose the diff adds, which is Nick's own
checker and the one list of rules:

```sh
~/.claude/hooks/check-constructions.sh < <added-prose.txt>
```

It prints the construction and the line for each hit, and prints nothing when
the prose is clean. A hit is evidence, never a verdict: read the line, and drop
the hit when it is a false positive.

Then read the added prose against `~/.claude/output-styles/nick-grammar-rules.md`
yourself, for the rules no regular expression can catch: a verb the subject
cannot perform, a reduced relative clause, an invented term, a sentence nobody
would say out loud.

Group the hits. Write one finding per file, or one per rule where a rule is
broken all over the change. `kind` is `"text"`. Quote the words from the change
in quotation marks. Say in plain words what is wrong with them. Then put the
rewrite in the `after` block. A report with a finding for every sentence is too
long to read.

### 6. Prove it before you write it

A finding about what a screen looks like, or about how something behaves, is
run in the real application first. One that cannot be proved is dropped rather
than softened.

A finding about code says what the code does, with the line in front of you.

### 7. Check your own writing

The report is writing too, so it follows Nick's rules. Before you render it,
run `check-constructions.sh` over the summary and over every `claim`, `why`,
`comment` and `question`. Leave out the words quoted from the change. Fix every
hit, then read the text against `~/.claude/output-styles/nick-grammar-rules.md`
yourself. The same goes for every finding a subagent returns.

### 8. Render and open

The findings file outlives this session, because Nick pastes his feedback into
whichever session does the work and that session reads the findings back. So it
goes somewhere durable rather than in a scratchpad:

```sh
dir=~/.claude/nick-review/<iid>-$(date +%Y%m%d-%H%M%S)
mkdir -p "$dir"
# write the findings to "$dir/findings.json"
node <skill>/render-report.mjs "$dir/findings.json" "$dir/report.html"
open "$dir/report.html"
```

One directory per merge request per run. Tell Nick the path of each report.

### 9. His feedback

Nick types into the boxes he wants to respond to and leaves the rest alone. He
clicks **Build my feedback** and pastes the markdown into whichever session he
wants the work done in, which is often a different one.

The markdown stays short. Each entry is the file, the line, the finding's id
and what he wrote. The header names `findings.json`, so the session he pastes
it into reads the evidence and the suggested fix out of that file by id.

Act on what he wrote. Ask him about the band 3 findings he left open. A band 2
finding missing from his feedback is agreed.

## The finding schema

```json
{
  "iid": 42,
  "title": "feat(checkout): a customer sees the total of their basket before they pay",
  "url": "https://gitlab.com/<group>/<project>/-/merge_requests/42",
  "author": "someone",
  "spec": "#17",
  "specUrl": "https://gitlab.com/<group>/<project>/-/issues/17",
  "files": 23,
  "summary": {
    "what": "A paragraph on what this merge request does, in your words.",
    "checked": ["each rule, document or file you read it against"],
    "couldNotCheck": ["each thing you could not verify, and why"],
    "verdict": "A paragraph on where you come out overall."
  },
  "findings": [
    {
      "id": "f1",
      "band": 1,
      "cls": "3 · silent truncation",
      "kind": "code",
      "file": "path/from/the/repository/root.py",
      "line": 198,
      "claim": "One sentence saying what is wrong.",
      "why": [
        "One piece of evidence per line, each a full sentence.",
        "<em>a name or a value</em> renders as code."
      ],
      "before": [["", "the code as it is"], ["", "one entry per line"]],
      "after": [["del", "the line removed"], ["add", "the line that replaces it"]],
      "question": "Band 3 only. The question for Nick.",
      "comment": "Why it matters, in a sentence or two."
    }
  ]
}
```

`summary` fills the collapsed section at the top of the report. Write it for
Nick rather than for a machine. `couldNotCheck` is where a gate you could not
run or a screen you could not open goes.

`cls` is the number and name of the class from `defects.md`.

`before` and `after` are arrays of `[kind, text]`. They are 2 blocks side by
side rather than one diff, so each one marks its own side and nothing else:

- `before` is the code as it is today. A line in it is unchanged (`""`) or
  going away (`"del"`). It never contains `"add"`.
- `after` is the code as you propose it. A line in it is unchanged (`""`) or
  new (`"add"`). It never contains `"del"`.
- A line that is the same in both is unmarked in both. Marking an unchanged
  line green makes the whole block read as new, which is the fastest way to
  make a finding unreadable.
- Both blocks show the same handful of lines around the change. Give enough
  context to place it, never the whole function.
`kind` is `"code"` by default. Set it to `"text"` when the blocks hold prose
rather than code, such as the merge request description, a readme or a
document. The report then draws them in a serif with no syntax colours, and
marks a changed line by its edge rather than by a `+` or a `-`. A finding about
the merge request description sets `file` to `the merge request description`
and leaves `line` out.

- A pure deletion has `"after": []`. The before marks the lines `"del"`, and
  the report says they go away with nothing in their place. Never write a
  sentence about the change into either block: they hold code.

The renderer refuses a finding that breaks this, and it names the finding and
the line.
`why` is the evidence, as an array of short lines. The report draws them as a
list under the heading **How I know**, so one line is one fact a reader can
check. Never write it as a paragraph: a slab of prose is unreadable at the
speed Nick goes through a report. Aim for 2 to 5 lines, each under 30 words.

`why` is the only field where HTML is allowed, and only `<em>`.

## Rules

- **Nothing is posted to GitLab.** Not a note, not a thread, not an approval.
  Nick posts. If he asks for a comment to go up, the rule in
  `~/.claude/CLAUDE.md` applies: your own opinion starts with `[claude]`, and
  his position goes up only after he has approved the text word for word.
- **A subagent never edits a file.**
- **Say what you could not check.** A gate you could not run, a screen you
  could not open, a card you could not read: it goes in the summary's
  `couldNotCheck` rather than being passed over.
- **The report is the deliverable.** Do not also write the findings out in
  chat. Tell him the path and what the counts are.
- **Keep the findings file.** Nick's feedback points at it, so deleting it
  breaks the paste. Old directories under `~/.claude/nick-review/` are his to
  clear out.

## Acting on a paste

A session given one of these pastes reads the `Findings:` path, loads that
JSON, and matches each `— <id>` to its entry. The entry has the claim, the
evidence, the before, the after and the band. Do what Nick's response says.
