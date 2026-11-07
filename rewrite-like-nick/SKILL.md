---
name: rewrite-like-nick
description: Rewrite a document so that it reads like Nick wrote it. Any document, like a README, an ADR, a skill, a guide, a wiki page, an MR description. Trigger on "rewrite this like me", "rewrite in my tone", "this is AI slop", "this reads like AI", or /rewrite-like-nick <path>. The whole document is never rewritten before Nick approved a calibration on a small sample.
effort: medium
---

# Rewrite like Nick

A document written by an agent reads like AI slop. It opens with low level
mechanics instead of the key idea, it leaves the agent's thinking in the text,
and the sentences are clipped and grammatically precise in a way that nobody talks.
This skill turns such a document into one that reads like Nick wrote it.

Nick's voice is in the output style `~/.claude/output-styles/nick-grammar-rules.md`.
Read it first, every time. This skill does not repeat it. This skill is the
procedure for a document, plus the rules that only matter when rewriting one.

The skill is iterated, not the agent. When Nick rejects a sentence, the fix goes
into this file (see *Learning*), so the next run doesn't make the same mistake.

## The procedure

Do the phases in order and stop where it says stop. Nothing is edited before
phase 4.

### Phase 1. Read

1. Read the whole document.
2. Read the format the repository expects for that kind of document, if there
   is one. The rewrite keeps that format.
3. Read `passages.md` in this skill's folder. It has one passage Nick wrote
   per kind of passage, and phase 4 continues from them.

### Phase 2. Diagnose

First run this over the document and keep the output for the diagnosis.
It lists the countable tells with their line numbers. A hit is not a
verdict. Judge each one, and say why any that stays, stays.

```bash
grep -n -o -i -E "—|;|not just|not only|it's not [^.]*, it's|serves as|stands as|underscores|highlights|showcases|crucial|pivotal|delve|important to note|in summary|overall,|moreover|furthermore|leverage|robust|seamless" <file>
```

Show Nick the themes that are wrong with the document, as a numbered list.
Each theme has 1 or 2 quotes from the document so he can see it, and one line
on what the fix is. Use the checklist in *What to look for* and add anything
else you see.

If a section looks like it doesn't belong in this kind of document, ask.
That is a question about the format, like a section the template doesn't
have. The rewrite changes the tone only, so never ask whether a section's
content is right or in scope.
The questions are their own numbered list, one section per item, under a
heading "Sections that may not belong". Never a paragraph, because Nick cannot
parse 3 questions out of a paragraph. Never drop a section silently.

### Phase 3. Calibrate

This phase happens in the chat only. No file is edited.

For each theme in the diagnosis, take the passage from the document that
shows the problem most clearly and show it in the chat as before and after,
under the name of the theme it calibrates. The After starts with one sentence
that says what changed and why, so Nick does not have to diff the 2 blocks by
eye. Then stop and wait. The chat message looks like this, with one heading
per theme:

````markdown
### 5. Sentences that don't follow each other

Before:

```markdown
This system uses HTTP APIs for reasons like frontend-backend and
service-to-service communication. The public API is called by the partners'
integrations.
```

After. The public API is one more reason the system uses HTTP APIs, so it
goes in the same list:

```markdown
This system uses HTTP APIs for reasons like frontend-backend communication,
service-to-service communication, and the public API which is called by the
partners' integrations.
```

### 4. Clipped sentences

Before:

```markdown
Every non-2xx answer is an RFC 9457 problem document,
`application/problem+json`, written by the API app's filter (ADR-0003). A
context raises a problem and never writes HTTP.
```

After:

```markdown
Every error response is an RFC 9457 problem document
(`application/problem+json`). It is the same format on every surface, so a
client only has to learn one error shape. The filter in the API app builds
the document (ADR-0003). A context returns a domain error and knows nothing
about HTTP.
```

## Input needed from you

1. **Review.** Regarding the 2 examples above. Please say which ones sound
   like you and which don't, and why, so I correct the rule before the
   rewrite.
````

When Nick rejects an example, the approach behind that theme is wrong, not
that one sentence. Every other sentence the agent would write for that theme
is built with the same wrong logic. So the fix is to work out from his words
what the rule actually is, write that rule into this skill, and show the
example again from the corrected rule. Then wait again. Keep going until he
says the examples are good. Patching the one sentence he quoted, and leaving
the rule as it was, is not calibration.

### Phase 4. Rewrite

Only after Nick said the sample is good. Rewrite the whole document in the
file. For each section, first delete every sentence the diagnosis marked
for deletion, so that nothing from it can be carried into the new text.
Then put the approved calibration passage for its
theme (or, when no theme fits, the passage from `passages.md` for its kind)
directly above where the section goes, then write the section as a
continuation of that passage, and delete the passage once the section is
written. Never write a section from the rules alone. A continuation of
Nick's text sounds like him more than text written from a description of
his voice does.

Then do a second pass before showing anything. Read every prose sentence on
its own, outside the tables and the code blocks, and ask whether a person
would say it out loud to a colleague. If not, write what the person would
say. A sentence rewritten from the shape of the original's sentence is still
the original's sentence: "A principle is the test a design is held to" became
"A principle is what we hold a design to", and Nick's answer was "what does
this mean?". The first pass applies the themes, the second pass catches what
the themes missed, and it is not optional. Nick read 5 lines and found 2 of
them. The check for each sentence is the rule *Use the normal verb for the
action* below, and whether the sentence names the concrete thing. Then read
each paragraph as a whole and check that its sentences are not all the same
length.

Then hand the file to a subagent that has read the output style, this
skill and `passages.md` and nothing else of this conversation, and ask it
for the sentences a person would not say out loud. Fix those too. The
writer and the reviewer are not the same agent, because the writer reads
its own sentences as fine.

Show the `git diff`. Do not commit, do not push, do not undo a commit, unless
Nick names that action. His answer to a question is an answer to that
question, never approval of a proposal bundled with it.

Nick reviews the diff and corrects sentences. Fix them, show the diff again.
Each rejected sentence is offered for *Learning*.

## What to look for

The themes that made Nick reject a document. Check each one.

1. **The key idea is not first.** The opening talks about mechanics (a file
   path, a prefix, how many kinds of something there are) before it says what
   the thing is and why we want it. The fix is an opening paragraph that says
   what the thing is, what we want from it, and what this document is for.
2. **The agent's thinking is left in.** Research notes, comparison tables of
   options when the result is already stated elsewhere, and open questions
   sitting inside a rule. All of it is deleted. An agent's open question is
   never turned into a placeholder in the document, because a placeholder
   marks something Nick decided to leave open, not something an agent wondered
   about. If the question matters, ask Nick in the chat.
3. **The document tells its own history.** What was missing before this
   document existed, what another document does not say, when something
   happened, "today", "currently", "now", dates, merge request numbers. All of
   it is deleted. The document lives forever and describes the thing as it
   is. The rewrite does not rewrite a history paragraph into better prose, it
   removes it. A paragraph that describes how the code is laid out now (which
   service serves what, which kinds of context exist) is history too, and
   so is a sentence that couples the document to a skill or a tool, because
   both will change. A dated fact in a Source column stays, because "the
   source is the source at the time of writing, it doesn't get out of date
   because the decision was based on that".
4. **Clipped sentences.** Short sentences with no joining words, the verb
   pushed to the end of the clause to look precise, metaphors for code,
   paragraphs that start with "Because". Nick really hates these. See
   *Rejected sentences*. A paragraph where every sentence is about the same
   length is the same problem, whether they are all short or all long.
5. **Sentences that don't follow each other.** Each sentence relates to the
   one before. A sentence that drops a new fact next to the previous one with
   no link belongs in the previous sentence, or needs a joining word.
6. **A marker on everything.** A label like `*EXAMPLE*` above every code
   block. A code block is an example without a label. A label is for a
   placeholder, something not decided.
7. **Things said twice.** The same point in 2 sections. The same rule as a
   sentence and as a row in a table.
8. **A reason that is not a reason.** Where the document lists why we want
   something, each item is a reason we care (consistency, security,
   performance and scalability, easy to use). It is not an outcome, not a
   process, and not one concrete example blown up into a top level idea.
9. **AI patterns.** "Not X but Y", lists of exactly 3, "serves as" for
   "is", "underscores" for "shows", "It's important to note", "In
   summary". The rules for each are in the output style. Quote each one
   found, because they are the easiest to prove and the easiest to fix.

## The rules of the rewrite

- **The content stays.** The rewrite changes the tone and the order. It does
  not drop a decision, a rule, an example or a table. If the document is the
  source of truth for its subject, everything on that subject stays in it and
  other documents reference it. Cutting a section is a question for Nick in
  phase 2, never a decision in phase 4.
- **The point first, then the example, then the reason.** In every section.
- **A rule keeps its source beside it.** A Source column on a table, or the
  reference after a rule, stays, because the reader needs to know where each
  rule comes from and where it is applied. One list of references at the end
  is not a replacement.
- **Full sentences with prepositions.** "The public API is called by the
  partners' integrations", not "the public API a partner's own integration
  calls". The passive is fine when that is how a person would say it.
- **Use the normal verb for the action, and the passive when that is how a
  person would say it.** The agent avoids the passive by making the thing the
  subject of a weak or metaphorical verb: "the ADR has the second pass
  applied", "an API answers in the shape that the screen renders", "the
  model holds". A person uses the verb for what happens: "the second pass
  has been applied to the ADR", "an API response is designed for the screen
  that reads it". Name the concrete thing, the response, the data model, the
  screen,
  not an abstraction like the shape or the representation. Nick: "why do you
  prefer to always put the subject at the start? you are not Grammarly".
- **Keep the format of the repository.** Same front matter, same section
  names, same file name.
- **Mark what Nick said is not decided.** An annotation, never prose, as the
  output style says. Only for a point Nick himself left open, never for a
  question the agent raised.
- **A section that keeps only the chosen option points to the rest.** When
  the refused options move to Alternatives considered, the section says "the
  other options are under *Alternatives considered*", so the reader does not
  have to work that out.
- **A paragraph of separate rules is a bullet list.** One rule per bullet.
  From Nick's "is this a list of separate points? should it be a bullet
  list?".

## Rejected sentences

Each one was written by the agent and rejected by Nick. The reason is in his
words. These are in addition to the ones in the output style.

**Bad:** This system uses HTTP APIs for reasons like frontend-backend and
service-to-service communication. The public API is called by the partners'
integrations.
**Why:** What is the relationship between the first and second sentence?
**Good:** This system uses HTTP APIs for reasons like frontend-backend
communication, service-to-service communication, and the public API which is
called by the partners' integrations.

**Bad:** and for the public API a partner's own integration calls.
**Why:** Putting "calls" at the end is grammatically precise, but it reads
badly. Use prepositions, because they make you sound real.
**Good:** The public API is called by the partners' integrations.

**Bad:** A partner's integration is code we don't control, so a breaking
change costs them, not us.
**Why:** It doesn't make sense.
**Good:** Easy to use and robust public API, so that clients can build their
own integrations easily and with confidence.

**Bad:** **Design before code.** The API for a story is written on the story
and reviewed before anyone builds it.
**Why:** This is process, not API design. Not a reason for this document.
**Good:** (dropped)

**Bad:** **Few calls from the frontend.** A screen should get what it needs in
one call where possible.
**Why:** One concrete example blown up into a top level idea.
**Good:** **Performance and scalability.**

**Bad:** Two stories that expose the same concept expose it the same way.
**Why:** It doesn't make sense either way. It is an outcome. The opening
paragraph already describes the outcomes.
**Good:** The Drivers list under *Approved text*.

**Bad:** A path names a thing. The method says what happens to it.
**Why:** Clipped sentences. Nick really hates these.
**Good:** A path names a resource, like an order, and the HTTP method says
what we are doing to it. So an action like cancelling is not a verb in the
path, it is a change to the status of the order.

**Bad:** All of the APIs are served by one service, `apps/api`. The routes
come from 3 kinds of context. A business context serves the routes for the
facts it owns, a frontend context serves the routes that one frontend needs,
and a technical context serves a mechanism like the health probe.
**Why:** I wouldn't write this. It is describing current state and will get
out of date very quickly.
**Good:** (deleted)

**Bad:** The `design-api` skill applies it to the stories of a sprint
before the sprint is built, so that a reviewer sees each design on the story.
**Why:** It has no business whatsoever. This is an ADR about design
principles, it is not coupled to skills and things that will change.
**Good:** (deleted)

**Bad:** A principle is what we hold a design to when none of the rules below
answers the question.
**Why:** What does this mean? (Rewritten from the original's shape instead of
from what a person would say.)
**Good:** These are the general ideas behind the rules in sections 2 to 11.
When a design question is not covered by one of those rules, we decide it by
these principles.

**Bad:** (the first paragraph of a section) The examples in this record use
the orders domain. `…` stands for `/api/shops/{shopSlug}`, which is the
prefix that the API app mounts every shop route under (`routes.ts`).
**Why:** What does this mean? What examples? Why is this inside this section?
It is not what the section is for. (Theme 1 applies to every section, not
only the opening of the document.)
**Good:** Deleted. Every example writes the full path instead of a shorthand.

**Bad:** An API answers in the shape that the screen renders, not in the
shape that the model holds.
**Why:** Nobody talks like this.
**Good:** An API response is designed for the screen that reads it, rather
than for the shape of the stored data.

**Bad:** We only build an operation when a story needs it, and the story says
who calls it.
**Why:** What does this mean? Humans don't talk like that.
**Good:** Every operation is built because a story needs it, and the story
identifies which frontend or integration will call it.

**Bad:** The skill is fixed and the ADR has the second pass applied in the
working tree.
**Why:** Nobody talks like this.
**Good:** The skill is fixed and the second pass has been applied to the ADR.

**Bad:** because an operation nobody calls is a contract we have to keep for
nothing.
**Why:** Sounds like nobody real wrote it.
**Good:** We only build what we need, to avoid complexity that has a cost but
no value.

**Bad:** Rewrite only the opening section and the drivers.
**Why:** This is tightly coupled to an ADR. The skill is for any document.
**Good:** (rejected again, see the next entry)

**Bad:** Rewrite a small sample. The sample is the opening paragraph, plus
one more passage that shows the worst theme from the diagnosis.
**Why:** The rule is to provide examples of each rule to calibrate, not the
opening section. Nick gave the opening section himself.
**Good:** For each theme in the diagnosis, take one passage from the document
that has the problem and rewrite it.

**Bad:** Today ADR-0003 says what the error document looks like and how the
public API is versioned, and ADR-0005 says what the surfaces are and how money
is represented. Nothing says how a resource is named, how a collection is
paged, what a link means or what happens on a stale write, so each route is
designed on its own and the designs don't agree with each other.
**Why:** Journalling again. "Today", there is no today, the ADR lives forever.
**Good:** (deleted, the opening paragraph already says what the document is
for)

**Bad:** ⚠️ This has not been discussed and decided: whether a context can
still choose its own external representation on the routes that are part of
the public API.
**Why:** What is this? Where is this coming from? (It was the agent's own
unresolved note in the original text, turned into a placeholder.)
**Good:** (deleted)

**Bad:** | Path segment | Plural noun, kebab-case | `orders`, `payment-methods` |
with one Sources line at the end of the document.
**Why:** Totally wrong. We need to know where each rule is applied, not just a
list of references.
**Good:** | Path segment | Plural noun, kebab-case | `orders`, `payment-methods` | Zalando, Azure |

**Bad:** **Security.** Every route says which ability it needs, and a request
from another shop gets the same answer as a resource that doesn't exist.
**Why:** How is that security? A mechanism pulled out of the decision is not a
reason we care.
**Good:** **Security**, so that every route is protected in the same way and
nothing leaks across shops.

**Bad:** Sections I am not sure belong, asked below rather than dropped: the
second item of Open points is repository state, not an API design decision.
Section 2 Code first and the two mentions of the skill are process. And
ADR-0002 has the Draft line under its title and this record does not.
**Why:** This should be a list. I cannot read that and parse out the points.
**Good:** A numbered list, one section per item.

**Bad:** Section 8, "Problems inside the ADRs themselves". These are 6
corrections to the ADRs rather than changes to the architecture document.
Should they go on a card?
**Why:** "ignore you are rewriting for tone not reviewing hte content"
**Good:** (not asked)

**Bad:** `| Version | OpenAPI 3.1 | Zalando |`, with "3.2.1 was published in
September 2026 and its tooling is not proven" deleted from the Source cell as
history.
**Why:** The source is the source at the time of writing, that is correct. It
doesn't get out of date because the decision was based on that.
**Good:** The row stays as it was.

## Approved text

Text Nick wrote or approved. A rewrite should sound like this.

> This system uses HTTP APIs for reasons like frontend-backend communication,
> service-to-service communication, and the public API which is called by the
> partners' integrations. We would like all HTTP APIs to be consistent, secure
> and generally follow modern best practices. This ensures that APIs meet the
> needs of consumers and reduces the costs for maintainers. It also makes
> building, evolving, and reviewing faster because certain choices are already
> made and don't need to be discussed every time.
>
> This record is the one place for the API design conventions. Other ADRs
> reference this, like ADR-0003 and ADR-0005.

A list of the reasons we want something. The last 2 are Nick's words, the
first 2 he approved.

> - **Consistency**, so that every API looks the same whoever designed it,
>   and a reviewer or a client only has to learn the conventions once.
> - **Security**, so that every route is protected in the same way and
>   nothing leaks across shops.
> - **Performance and scalability.**
> - **Easy to use and robust public API**, so that clients can build their
>   own integrations easily and with confidence.

## Learning

This skill updates itself. The agent proposes the update, Nick approves it.

1. Fix the sentence in the reply first.
2. Offer the update as an item in "Input needed from you": "Add to the skill?
   Bad: <sentence>. Why: <Nick's words>. Good: <his version>." Text Nick
   approves is offered for *Approved text*. A theme he names that is not in
   *What to look for* is offered there.
3. On yes, edit this file and show the diff.

Before adding, look for an existing entry that already covers it and replace
it. One correction is one example, not a rule. If this file grows past about
250 lines, propose which entries to drop.
