---
name: nick-walkthrough
description: A walkthrough of a merge request for Nick to read instead of the diff. Trigger on "walk me through !N", "walkthrough of !N", "/nick-walkthrough <iid>" and on a pasted block that starts with "Nick's feedback on the walkthrough". It explains what the merge request does as a list of points, shows the code behind each point and opens an HTML page that Nick comments on. It never posts anything to GitLab.
---

# nick-walkthrough

A merge request with 100 changed files takes hours to read file by file. A
walkthrough explains the change as a short list of points. Under each point it
shows the code that a reviewer needs to see. Nick reads the page, comments on
the blocks that aren't clear and pastes his feedback into a session.

`nick-review` is the companion skill. It looks for defects, whereas this skill
explains the change.

This skill never posts anything to GitLab.

## The context of every piece is explicit

This matters more than anything else in this file.

A reviewer of a merge request that touches several contexts is mostly
checking what depends on what. When they have to guess which context a file,
a class or a call belongs to, they either guess wrong or go hunting for it.
A wrong guess means that a dependency between 2 contexts is approved without
being seen.

Nick can tell the context of whichever piece of the page he is looking at
from that piece alone. A piece is a sentence, a code block, a line
of code or a row of a table. He never has to scroll, open another point or
remember what an earlier passage described.

The page and the source share the work:

- **The front matter has one `context:` line per context.** The renderer
  refuses a code block whose file isn't under one of them. It draws the name
  of the context as a coloured badge on every code block. It also marks every
  line that imports from the package of another context.
- **The text writes the name of a context exactly as its `context:` line
  does.** The renderer then draws the name in the text with the same coloured
  badge as on the code blocks so a context looks the same everywhere on the
  page. "The billing context" becomes a badge, but "billing" on its own
  doesn't.
- **Each passage writes the context of a thing at its first mention.** A
  passage is read on its own, which means "the adapter" isn't clear even when
  that adapter was described by the passage before. The entry "A thing mentioned
  without its context" has the details.
- **A table or a list whose rows are in different contexts has the context in
  each row**, as a column or as the first words of the item.
- **A call that leaves its context is announced before the code.** The entry
  "A code block that calls another context without the text announcing it"
  has the details.

Don't write the context in front of every noun of every sentence. Once per
passage is enough for each thing. A merge request that only touches one
context still has its one `context:` line.

## The procedure

### 1. Read the merge request

```sh
glab mr view <iid> -F json                          # title, url, author, target branch
git fetch origin merge-requests/<iid>/head <target branch>
git merge-base origin/<target branch> FETCH_HEAD    # the base
git diff --numstat <base> <head>
```

Read a file at the head with `git show <head>:<path>`. Don't check anything
out.

### 2. Work out the points

Describe one request from the outside in. Start with what a caller sees, such
as a route, a screen or a command. Then follow the code down through each
layer, from a controller to a use case, a port, an adapter and a domain model. Each
step that a reviewer needs to know about is one point. A merge request usually
has 4 to 8 points.

While you follow the code, write down every call that leaves its context,
such as a use case of one context that calls a port whose adapter calls
another context. A reviewer cares about these more than about anything else
in the diff. Each one has to be announced in the passage that first shows it,
as described in "A code block that calls another context without the text
announcing it". Each one that is new also goes on the Architecture tab.

Show Nick the list of points in chat first when he hasn't seen it. He corrects
the list faster than he corrects a page.

### 3. Establish every fact

A walkthrough only contains facts. Read each sentence off the code, off a test
or off the output of a command. Never write "I think" or "probably".

When you can't establish a fact, stop and ask Nick. In auto mode, write the
block anyway and start it with `[USER INPUT REQUIRED]`.

### 4. Write the source

The source is one markdown file. Its format is described in "The source
format" below. Save it in a folder that outlives the session:

```sh
dir=~/.claude/nick-walkthrough/<iid>-$(date +%Y%m%d-%H%M%S)
mkdir -p "$dir"
# write "$dir/walkthrough.md"
```

### 5. Check your own writing

The page is writing so it follows Nick's rules. Run the prose of the source
through `~/.claude/hooks/check-constructions.sh` and fix every hit. Then read
it against `~/.claude/output-styles/nick-grammar-rules.md`.

### 6. Render and open

Run the renderer from the repository of the merge request:

```sh
node ~/.claude/skills/nick-walkthrough/render-walkthrough.mjs "$dir/walkthrough.md" "$dir/walkthrough.html"
open "$dir/walkthrough.html"
```

The renderer reads every code block back from git. It refuses a line that
isn't in the file at the head of the merge request and prints each one. Fix
the source until it renders. Never loosen the check.

Tell Nick the path of the page. Don't repeat the walkthrough in chat.

## Updating a walkthrough

Nick comments on as many passages as he wants while he reads. Each comment
is saved in his browser as he types. At the end he clicks **Collect all my
feedback** on the page and pastes the result into a
session. That session is often a different one from the session that wrote the
walkthrough. The paste contains everything the session needs:

- `Source` is the path of the markdown file.
- `Page` is the path of the HTML file.
- `Repository` is the folder to run the renderer from.
- Each entry has a block id and Nick's comment.

A block id such as `t1p3.b2` is the 2nd block under the 3rd `## ` heading of
the 1st `# ` heading. `t1p0` is the overview, which is the text before the
first `## ` heading. A code block, a paragraph, a list, a table and a quote
each count as one block.

For each comment:

1. Read the block in the source and the code that it describes.
2. When the comment is a question, find the answer in the code. Then change
   the source so that the page itself explains the answer. Reply in chat with
   one line per comment that describes what changed.
3. Fix the root cause as well as the page. Ask which rule of this file would
   have prevented the comment. When a rule is missing or unclear, change this
   file in the same pass. Then tell Nick which rule changed.

Then render the page again to the same path and tell Nick to reload it. His
comments are stored in his browser per render so the new page starts without
any comment.

## The source format

```markdown
---
iid: 412
title: feat(exports): the export job retries a failed upload
url: https://gitlab.com/<group>/<project>/-/merge_requests/412
author: someone
context: backend/libs/exports = exports context = @acme/exports
context: backend/libs/billing = billing context = @acme/billing
base: <full sha of the merge base>
head: <full sha of the head>
---

# The change

One paragraph that describes what the merge request does.

## The export route returns a 503 after the last retry {503 after retries}

A paragraph, with `Names` in backticks.

- A list item.

| A | table |
|---|---|
| a | row |

> ⚠️ A block that needs Nick's attention.
```

A `context:` line is `<path prefix> = <name of the context> = <name of its
package>`. The name of the package is what another context writes in an
`import` to use it. Leave the package out when the folder isn't imported by
name, such as an app or a tooling folder.

A code block starts with its language and the path of its file. Write
`@base` after the path to show the file on the target branch:

````markdown
```ts backend/libs/exports/src/application/export-invoice.handler.ts
const policy = UploadRetryPolicy.fromAttempts(command.attempts)
…
return new UploadRetriesExhausted() //~ the refusal of point 3
```
````

- Copy each line from the file exactly. The renderer finds its line number,
  links the path to GitLab and marks the lines that the merge request adds.
- `…` on its own line is a gap between 2 parts of the file.
- ` //~ ` starts a note that is shown beside the line.
- A code block without a path isn't checked. Use one for an example of a
  request or a response.
- A `flow` block before the first `## ` heading is drawn as a sequence
  diagram. Each line is `<from> -> <to>: <label> @<number of the point>`.
  Write `-->` for a refusal or a response.

The renderer links every name in backticks that a changed file exports. It
also links every path of a changed file. It also adds the last tab, "Every file", which
lists each changed file next to the points where that file is shown.

## The tabs

Each `# ` heading is a tab. A merge request can have these 3:

1. **The change.** The points of step 2, in the order the code runs. The text
   before the first `## ` heading is the overview. Put the `flow` block there.
2. **Architecture.** What changes between contexts rather than inside one. A
   new dependency in a `package.json` belongs here even though the file is
   config, because a reviewer reads it as coupling between 2 contexts.
   - a new dependency between 2 contexts or 2 packages
   - a new API port or SPI port
   - a new export from the `index.ts` of a context
   - a new table, queue or event that another context can read
3. **Docs and config.** What isn't code and isn't architecture.
   - documentation, such as a README, an ADR or a glossary
   - config, such as a lint rule, a coverage threshold or a pipeline file
   - generated files, listed with the source that each one is generated from

Leave a tab out when the merge request doesn't have anything for it.

Mark anything with a wide impact with `> ⚠️`, on whichever tab it is. A new
dependency between contexts, a lower coverage threshold and a changed coding
convention are examples. The page lists every `> ⚠️` block of every tab on the
overview so Nick sees all of them before he opens a point.

Give each `## ` heading a short label in braces. The label is shown in the
timeline at the top of every point, where the full heading doesn't fit:

```markdown
## The export job retries a failed upload {Retry}
```

## How to write a point

Each entry below describes one mistake, where it happens and where it doesn't.
An entry isn't a rule to apply to every sentence.

### A passage that opens on a piece of code the reader didn't ask about

This happens in the middle of a point. The heading has set a goal, such as
"The export job retries a failed upload". The next passage then opens with
"`UploadRetryPolicy` is a new value object of the exports context". The reader
doesn't know yet why the goal needs a value object so the sentence has no
connection to anything they have read.

Open the passage on what the goal still needs. Then introduce the code that
meets that need. Then show the code.

**Bad:**

> `GetInvoiceOwner` is a new SPI port of the exports context. Its adapter
> calls the billing context.

**Good:**

> An export is only allowed for the owner of the invoice, but the owner is
> stored by the billing context. The exports context asks for it through a new
> SPI port called `GetInvoiceOwner`.

This doesn't apply when the passage before has already raised the need. After
"`ExportHandler` calls 2 new ports", a passage can open with "`GetInvoiceOwner` is
the first one". It doesn't apply to the heading of a point either, because the
heading is the goal.

The page shows the first sentence of a passage in bold beside its code so a
reader who only reads the bold sentences should still follow the point.

### A paragraph that piles up every fact about the code under it

The entries above ask for the context, the dependency and the reason of
everything in a block. Written as one paragraph, that is 8 sentences that
Nick won't read. The renderer refuses a paragraph of more than 3 sentences or
60 words.

Keep the first sentence, which is the point. Then move each other fact to
the place where it belongs:

- Facts of the same kind, such as one per dependency, become bullets.
- A fact about one line of the block becomes a ` //~ ` note on that line.
- A fact that the passage before already gave is deleted.
- A fact about something else becomes its own passage with its own code.

Never get under the limit by joining sentences with "and" or by cutting the
context of a thing.

### A new method, class or port that is shown without one of its callers

A definition on its own is useless to a reviewer. They see that a method was
added to a controller, but they can't see that anything calls it. The text
often claims the use, as in "each of the 4 routes calls the new method", while
the code block under that sentence only shows the new method.

Show one caller first, then the definition, directly after each other. Mark
the calling line with a ` //~ ` note. When there are several callers, show one
and list the others.

**Bad:** a passage with the new `#withRetry` method of `ExportController`,
followed by a passage about the port that `#withRetry` calls.

**Good:** a passage with `exportInvoice` calling `#withRetry`, with a note on
that line. Then a passage with `#withRetry` itself. Then the list of the
other 3 routes. Only then a passage about the port.

A caller comes first because the walkthrough goes from the outside in. The
reader already knows the caller from the point before.

This doesn't apply to code that a framework calls, such as a route of a
controller or a provider of a module. Show its decorator or its registration
instead. It doesn't apply to a type either when the block that uses the type
is already on the page.

### 3 or more names of the same kind inside one sentence

**Bad:**

> The other 4 files with the same line are `order-problems.ts`,
> `invoice-problems.ts`, `refund-problems.ts` and `export-problems.ts`.

**Good:**

> These 4 files have the same line:
>
> - `order-problems.ts`
> - `invoice-problems.ts`
> - `refund-problems.ts`
> - `export-problems.ts`

A reader scans a column of file names faster than a sentence. Each name
also becomes a link on its own line.

This is only for names that are the same kind of thing and that the reader
might want to open, such as files, classes, routes or tests. 2 names stay in
the sentence. The steps of one request stay in a sentence too ("from a
controller to a use case and then to a port"), because their order is the
content. Use a table instead of bullets when each name has a second fact, such
as the action that each handler checks.

### A thing mentioned without its context

In a merge request that touches 3 contexts, "the port" or "the adapter" could
be in any of them. Some names even exist twice, such as a `GetOrder` port in
both the BFF and the orders context.

At the first mention in a point, write the kind of thing and its context:
"the `GetInvoiceOwner` SPI port of the exports context". Later mentions in the
same passage use the bare name. The next passage writes the context again,
because the page shows each passage as its own row. A class whose name is unique in the merge
request still needs its context the first time, because the reader hasn't
learned the name yet.

### A code block that calls another context without the text announcing it

A method contains `this.getInvoiceOwner.apply(…)`. It reads like a call to
something local. In fact `getInvoiceOwner` is a port whose adapter calls
the billing context. That line is a dependency between 2 contexts, which is
the most important fact in the block for a reviewer. The code doesn't
show it. A walkthrough that stays silent about it, or that only explains it
in a later passage, has failed at its main job.

The reader has to know about the dependency before they read the code.
Announce it in the text above the block:

- which other context the code depends on
- which port the call goes through
- which context owns that port
- whether the dependency is new in this merge request

Then show it in the block. Include the `import` line and the line that
injects the port, with a ` //~ ` note on the import where the path alone
doesn't show what the name is.

A dependency that is new in the merge request is also a point on the
Architecture tab, under a `> ⚠️` block. Refer to that tab in the passage.

**Bad:**

> The new method reads the owner of the invoice and then runs the export.

followed by a block with only the body of `#exportForOwner`.

**Good:**

> The new method is where the exports context starts to depend on the
> billing context. The dependency is new in this merge request and is on the
> Architecture tab. The method reads the owner of the invoice from the billing
> context through `GetInvoiceOwner`, which is a new SPI port of the exports
> context.

followed by a block with the `import` of `GetInvoiceOwner`, the constructor
line where `GetInvoiceOwner` is injected and then `#exportForOwner`.

A call that stays inside one context doesn't need any of this, such as a use
case calling its own repository. A dependency on another context that already
existed before the merge request still needs its context in the text, but one
clause is enough and it doesn't need a warning. Don't show the import of a
framework decorator or of a helper whose name describes it.

### Something in a code block that the text didn't prepare the reader for

The reader should never meet a surprise in the code, such as a constant
called `DUMMY_USER_ID`, a `TODO`, a thrown error or a cast. They stop and ask
whether it is a problem. The walkthrough doesn't tell them.

Either describe it and its reason in the text above the block, or cut the
lines from the block with `…`. Lines that are ordinary for the file, such as
imports, a constructor or a decorator, don't need a description.

### A repeated change shown several times, or shown once without its exceptions

When the same edit is made in 6 handlers, the reader doesn't learn anything from the
second code block. Show one in full, then list the other 5 and
write that they have the same change.

Before you write that, compare all of them. The exceptions are where the
defects are. When one place differs, show its code under a `> ⚠️` block that
describes how it differs. When the copies differ only by a name, such as the
action that each handler checks, a table of the names is enough.

### A change at the boundary of a context that is left out or only implied

A new port, a new export from an `index.ts` and a new dependency in a
`package.json` are each a contract between 2 contexts. A reviewer always
wants to see them, even when the change is one line. Show the declaration of
a new port and write which context calls which.

A private method, a new file inside one context or a renamed local variable
isn't a boundary change. Show one of those only when it is needed to
understand the point.

### A sentence that isn't proved by the code

Never write "I think", "probably" or "should". When a sentence is a
consequence rather than something visible in one file, such as "a real user
is never refused today", prove it first. Show the lines that
the sentence follows from. Show the test of that behaviour too.

When you can't prove it, stop and ask Nick. In auto mode, keep the sentence
and start it with `[USER INPUT REQUIRED]`.

### A decision that applies to the whole change rather than to one file

Some merge requests have one, such as "the tenant id is never passed down as
a parameter". A code block can't show it, because it is about what isn't there.
Without it the reader can't tell why half of the code exists.

Write it as the second paragraph of the tab, in 2 or 3 sentences. Refer to it
again in the point where it is implemented. Most merge requests don't have
one. Don't invent one for them.

## The page

Nick reads the page on a laptop. `walkthrough.css` and `render-walkthrough.mjs`
are built around these constraints. Keep them when you change either file.

- **The code is always fully visible.** A long line wraps. A code block never
  scrolls sideways. A code block is never clipped either, because Nick can't review a line that
  he can't see.
- **Text is above its code, never beside it.** A laptop screen is too narrow
  for a column of text next to a column of code. The code would be squeezed
  into half of the width.
- **One column.** A laptop screen doesn't have room for a sidebar next to
  the code.
- **Body text is dark on white.** Grey text on a grey background is hard to
  read. Only a label, such as a line number or a path, is grey.
- **One point per screen.** A reader who sees 7 points and 40 code blocks on
  one scrolling page doesn't know where to start.
- **The timeline is on every screen.** One point per screen hides the story
  so the row of numbered points stays at the top. It shows which point is
  open, which ones are read and which ones have a warning.
- **The overview shows the whole change at a glance.** It has the summary,
  every warning of every tab, the diagram and the list of points with one
  line each. A warning that is only visible inside a point is a defect.

Look at the page before you show it to Nick. Take a screenshot at the size of
a laptop screen and read it:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --window-size=1440,900 --screenshot="$dir/check.png" "file://$dir/walkthrough.html#t1p2"
```

## Rules

- **Never post anything to GitLab.**
- **The page is the deliverable.** Tell Nick the path. Don't write the
  walkthrough out in chat as well.
- **Keep the folder.** Nick's feedback contains its path so deleting it breaks
  the paste. Old folders under `~/.claude/nick-walkthrough/` are his to clear
  out.
