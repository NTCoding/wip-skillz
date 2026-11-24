---
name: nick-walkthrough
description: A walkthrough of a merge request for Nick to read instead of the diff. Trigger on "walk me through !N", "walkthrough of !N", "/nick-walkthrough <iid>" and on a pasted block that starts with "Nick's feedback on the walkthrough". It explains what the merge request does as a list of points, shows the code that each point is about and opens an HTML page that Nick comments on. It never posts anything to GitLab.
---

# nick-walkthrough

Use this skill to write a walkthrough of a merge request for Nick to read
instead of the diff. The walkthrough explains the change in detail, point by
point. A point is one thing about the change that a reviewer needs to know.
Under each point, the walkthrough shows the code that the point is about.

Nick will comment on the parts of the page that aren't clear. He'll then paste
his feedback into a session so that the walkthrough can be updated.

`nick-review` is the companion skill. It looks for defects, whereas this skill
explains the change.

## The context of every piece is explicit

A context is one part of the codebase that has a separate package and domain
model. The billing context and the exports context are examples. Each piece of
the page shows its context explicitly, because a reviewer of a merge request
that touches several contexts is mostly checking what depends on what. This
matters more than anything else in this file.

If a reviewer has to guess the context of a piece of code, they'll often guess
wrong or have to go hunting for the context. A wrong guess can mean that a
dependency between 2 contexts is approved even though the reviewer hasn't seen
the dependency.

A passage is a `### ` title and all the paragraphs and code blocks under the
title, up to the next `### ` or `## ` heading. The page shows each passage as a separate section. A piece is a sentence, a
code block, a line of code or a row of a table.

Nick needs to be able to tell the context of any piece from that piece alone.
He doesn't need to scroll or open another point. He doesn't need to remember
what an earlier passage described either.

The source is the markdown file that you write in step 4. The renderer is the
script that turns the source into the HTML page in step 5. Both of them help
to show the context of each piece:

- **The source's front matter has one `context:` line per context.** Each
  line starts with the folder of that context. If a code block shows a file
  that isn't in any of those folders, the renderer fails.

  The renderer draws the name of the context as a coloured badge on every
  code block. It also marks every line that imports from another context's
  package.
- **Write the name of a context in the text exactly as it is in its
  `context:` line.** The renderer then draws the name with the same coloured
  badge as on the code blocks so a context looks the same everywhere on the
  page. "The billing context" becomes a badge, but "billing" on its own
  doesn't.
- **In each passage, write the context of a thing at its first mention.** The
  details are in "A thing mentioned without its context".
- **When the rows of a table or a list are in different contexts, write the
  context in each row**, either as a column or as the first words of the item.
- **When the code calls another context, announce the call in the text above
  the code block.** The details are in "A code block that calls another
  context without the text announcing the call".

Usually you only need to write a thing's context once per passage, rather than
in front of every noun in every sentence.

A walkthrough's source has at least one `context:` line, even for a merge
request that only touches one context.

## The procedure

### 1. Read the merge request

Fetch the head of the merge request and work out its base:

```sh
glab mr view <iid> -F json                          # title, url, author, target branch
git fetch origin merge-requests/<iid>/head <target branch>
git merge-base origin/<target branch> FETCH_HEAD    # the base
git diff --numstat <base> <head>
```

A merge request can be stacked on another one. The target branch of a
stacked merge request can be rebased after the merge request was created from
that branch. The merge base is then too far back. So the diff also shows every
commit of the merge request underneath. GitLab then reports a conflict,
which is `has_conflicts: true` in the JSON of `glab mr view`. In that
case, take the parent of the first commit of the merge request as the base:

```sh
git cherry -v origin/<target branch> FETCH_HEAD     # "-" is already on the target branch, "+" is new
first=$(git cherry origin/<target branch> FETCH_HEAD | grep '^+' | head -1 | cut -c3-)
git rev-parse "$first^"                             # the base
```

`git log <merge base>..FETCH_HEAD` doesn't find that first commit because it
lists the commits of the merge request underneath too. `git cherry` marks each
commit whose change is already on the target branch with a `-`. So the first
commit with a `+` is the first commit of this merge request. Read the list
before you use the base. A commit of the merge request underneath can also
have a `+` if the target branch was rebased with a conflict.

Read a file at the head with `git show <head>:<path>` rather than checking
anything out.

### 2. Work out the points

In most merge requests, the points follow one request through the code, such
as an HTTP request or a command. A merge request that only changes docs or
config still has points, but they don't follow a request. A merge request
usually has 4 to 8 points.

To follow a request, describe it from the outside in. Start with what a caller
sees, such as a route or a screen. A command is another example.

Then follow the code down through each layer. The usual layers are a
controller and a use case, followed by a port and an adapter. The domain model
is the last layer.

While you follow the code, write down every call to another context, because a
reviewer nearly always wants to know about a call like that. An example would
be a use case in one context that calls a port whose adapter calls another
context. Announce each call like that in the passage that first shows the call
as described in "A code block that calls another context without the text
announcing the call". If the call is new, also add it to the Architecture tab,
which is the tab for changes between contexts (see "The tabs").

If Nick hasn't seen the list of points yet, show it to him in the chat first.
It's quicker for him to correct a list than a page.

### 3. Establish every fact

A walkthrough only contains facts. So check each sentence against the code. A
test or the output of a command can be used as evidence too. The details,
including what to do if you can't establish a fact, are in "A sentence that
isn't proved by the code".

### 4. Write the source

The source is one markdown file, in the format described in "The source
format" below. Save it in a folder that isn't deleted when the session ends:

```sh
dir=~/nick-walkthrough/<iid>-$(date +%Y%m%d-%H%M%S)
mkdir -p "$dir"
# write "$dir/walkthrough.md"
```

### 5. Render and open

Run the renderer from the merge request's repository. The renderer is in the
base directory of this skill, which is the folder that the harness prints
when it loads the skill:

```sh
skill=<the base directory of this skill>
node "$skill/render-walkthrough.mjs" "$dir/walkthrough.md" "$dir/walkthrough.html"
open "$dir/walkthrough.html"
```

The renderer checks every code block against the file in git. The file is
read at the head of the merge request, or at the merge base if the block has
`@base`. The renderer fails on a line that isn't in that file. It prints each
line like that.

Fix the source until the page renders. Never loosen the check.

Tell Nick the page's path rather than repeating the walkthrough in the chat.

## Updating a walkthrough

While Nick reads the page, he selects any text that he wants to comment on,
such as a sentence or a few lines of code. A **Comment** button then appears
next to the selection. Nick writes his comment in the card that opens. The
text that he selected stays highlighted on the page.

Each comment is saved in his browser. He can click a highlight to edit or
delete its comment. The **Comments** tab lists every comment on the page:

- A click on the title of a comment opens the place of the comment on the
  page.
- **Edit** and **Delete** change the comment.

At the end, he'll click **Collect all my feedback** on the page and paste the
result into a session.

This is often a different session from the one where the walkthrough was
written. That's why the text he pastes includes everything the session needs:

- `Source` is the path of the markdown file.
- `Page` is the path of the HTML file.
- `Repository` is the folder to run the renderer from.
- Each entry is one comment.

An entry looks like this:

```markdown
### t1p3.b2: 2. `UploadRetryPolicy` stops a 4th upload, under "The export job stops after 3 failed uploads"

The selected text:

> return new UploadRetriesExhausted()

Nick's comment:

> Which caller reads this error?
```

The heading of the entry is the id of the passage that contains the selected
text, followed by the passage's title. The id can also point at a whole point,
such as `t1p3`, or at a `> ⚠️` block, such as `t1p3.w1`. The selected text
shows the sentence or the line of code that the comment is about.

A passage id such as `t1p3.b2` points at the 2nd `### ` passage under the 3rd
`## ` heading in the 1st `# ` heading. The ids are described in "The source
format".

For each comment:

1. Read the passage in the source and the code that the passage describes.
2. If the comment is a question, find the answer in the code. Then change the
   source so that the answer is on the page itself.
3. If the comment points at a mistake, fix the root cause as well as the page.
   Ask yourself which rule in this file would have stopped that mistake. If
   the rule is missing or unclear, change this file in the same pass. Then
   tell Nick which rule you changed.
4. Reply in the chat with one line for each comment. Each line describes what
   changed.

Then render the page again to the same path and tell Nick to reload the page.
His comments are stored in his browser for each render so the new page starts
without any comments.

## The source format

A source looks like this:

```markdown
---
iid: 412
title: feat(exports): the export job retries a failed upload
url: https://gitlab.com/<group>/<project>/-/merge_requests/412
author: someone
context: modules/exports = exports context = @shop/exports
context: modules/billing = billing context = @shop/billing
base: <full sha of the merge base>
head: <full sha of the head>
---

# The change

One paragraph that describes what the merge request does.

## The export route returns a 503 after the last retry {503 after retries}

A paragraph that introduces the point.

### The export job stops after the 3rd failed upload

A paragraph, with `Names` in backticks.

- A list item.

| A | table |
|---|---|
| a | row |

> ⚠️ **A short title** A block that needs Nick's attention.
```

A `context:` line is `<path prefix> = <name of the context> = <name of its
package>`. The path prefix is the folder of the context. The package's name is
what you'd write in an `import` in another context to use this one. Leave the
package out for a folder that isn't imported by name, such as an app or a
tooling folder.

Each passage in a `## ` point starts with a `### ` line, which is the
passage's title. Everything under the title up to the next `### ` or `## `
heading belongs to the passage. The page shows the title as a heading above
the passage and numbers the passages of each point from 1.

The title is a heading rather than the first sentence of a paragraph. So the
paragraph under the title doesn't continue from the title. It starts its
context again, as described in "Each point is built to be read on its own".

Before the first `### ` title, a point only has an intro. The intro contains
the paragraphs that introduce the point, a `steps` block or a table of
contents and any `> ⚠️` blocks. The renderer fails on any other block that
isn't under a `### ` title.

A `> ⚠️` block isn't a passage. It isn't numbered or listed in the `steps`
block or the table of contents. A `> ⚠️` block also ends the passage above
the block. That's why the next line after a `> ⚠️` block in the middle of a
point is always a `### ` title.

A `> ⚠️` block starts with a short title in bold. The title describes the
problem that a reviewer needs to know about in a few words. The text after the
title explains the problem:

```markdown
> ⚠️ **`UploadRetryPolicy` doesn't have a test** The 3 new branches of
> `UploadRetryPolicy.isExhausted` aren't run by any test in the exports context.
```

The page shows the title as the heading of the block. The overview lists the
title of every `> ⚠️` block as a section that is closed at first. A click on
the title opens the section, which shows the text and a link to the block. The
renderer fails on a `> ⚠️` block without a title.

Each passage has an id, which is used in links and in Nick's comments:

| Id | What the id points at |
|---|---|
| `t1p0` | the overview of the 1st tab, which is the text before the first `## ` heading |
| `t1p3` | the 3rd `## ` point of the 1st `# ` tab |
| `t1p3.b2` | the 2nd `### ` passage of that point |

Only the `### ` titles are counted. That's why a paragraph or a code block
that's added inside a passage doesn't change the id of any passage. To link
to a passage, write the passage's id after `#`, as in
`[2 new SPI ports](#t1p3.b2)`.

A code block starts with the language and the file's path. To show the file as
it is at the merge base rather than at the head, write `@base` after the path:

````markdown
```ts modules/exports/src/application/export-invoice.handler.ts
const policy = UploadRetryPolicy.fromAttempts(command.attempts)
…
return new UploadRetriesExhausted() //~ the error from point 3
```
````

- Copy each line from the file exactly. The renderer finds the number of each
  line, links the path to GitLab and marks the lines that the merge request
  adds.
- A line with only `…` on it is a gap between 2 parts of the file.
- ` //~ ` at the end of a line starts a note on that line, as described in
  "Notes on lines of code" below.
- A code block without a path isn't checked. Use one for an example of a
  request or a response.
- A `flow` block before the first `## ` heading is drawn as a sequence
  diagram. Each line is `<from> -> <to>: <label> @<number of the point>`.
  Write `-->` for an error or a response.
- A `types` block after the `flow` block is drawn as a type diagram under the
  sequence diagram. The type diagram shows how the types fit together, which
  the sequence diagram doesn't.

  The type diagram has one column per context. Each type is drawn as a box
  with only the type's name in the box. The colour of the box shows what kind
  of type it is, which is explained by the legend under the diagram.

The `types` block has 2 kinds of line. A line with `=` declares a box. A line
with `->` draws an arrow from one box to another. The line ends with the
number of the walkthrough point that the arrow belongs to:

````markdown
```types
Invoice = aggregate in billing
InvoiceOwner | InvoiceNotFound = value object | domain error in billing
ReadInvoiceOwner = API port in billing
GetInvoiceOwnerInProcAdapter = adapter in exports
GetInvoiceOwner = SPI port in exports
ExportOwner | InvoiceNotFound = value object | domain error in exports
ExportPermission = value object in exports

Invoice -> InvoiceOwner | InvoiceNotFound @2
InvoiceOwner | InvoiceNotFound -> ReadInvoiceOwner @2
ReadInvoiceOwner -> GetInvoiceOwnerInProcAdapter @2
GetInvoiceOwnerInProcAdapter -> GetInvoiceOwner @2
GetInvoiceOwner -> ExportOwner | InvoiceNotFound @2
ExportOwner | InvoiceNotFound -> ExportPermission @3
```
````

- Declare the boxes in the order the code runs, because each box is drawn
  below the previous box. The exception is a box in another context that has
  an arrow from the previous box. Those 2 boxes are drawn side by side.
- Write a union with `|`. Each type in the union can be a different kind. The
  types of a union are drawn stacked in one box.
- When 2 boxes share a name, write `in <context>` after that name in every
  arrow, as in `OpenSessionInProcAdapter -> OpenSession in identity @3`. Leave
  every other name bare. The renderer fails on a bare name that 2 boxes share.
- Read the kind of each type off its declaration in the code. Some of the
  colours are taken from event storming, such as orange for a domain event
  and blue for a command:

  | Kind | Colour | What it is in the code |
  |---|---|---|
  | `domain error` | red | a class that extends `DomainError` |
  | `domain event` | orange | an event that the domain raises |
  | `aggregate` | yellow | an aggregate root |
  | `command` | blue | the input of a use case |
  | `value object` | teal | any other class in `domain/` |
  | `plain array` | grey | an array of strings or of a union of strings |
  | `API port` | purple pill | the interface that a context offers to other contexts |
  | `SPI port` | dashed purple pill | the interface that a context calls when it needs something from outside, which an adapter implements |
  | `adapter` | pink | the class that implements an SPI port, often by calling another context's API port |

- Never draw an arrow straight from a type in one context to a type in
  another. When a type is passed from one context to another, draw each box
  that the type is passed through:
  - the API port in the context that the type comes from
  - the adapter that calls that API port
  - the SPI port that the adapter implements
- The diagram only shows what the types are. So never colour a box or an
  arrow because you think the code is wrong. If you think the code is wrong,
  write that in a point.

If a point follows one call through the code, from the route down to the
domain model, add an empty `steps` block to that point. The reader then sees
every step of the point on one screen.

The renderer builds the chain of steps from the passages of the point. Each
`### ` passage is one step, which is drawn as a numbered box that contains the
title of the passage. The box also shows the context of the first code block
in the passage that has a path. A passage without a code block like that has a
box without a context. Each box links to its passage. That way the reader can
jump straight to the code of any step.

Write the empty block after the point's intro paragraphs and before the first
`### ` title:

````markdown
## The export job stops after 3 failed uploads {Retry limit}

The export job in the exports context tries an upload 3 times at most.

```steps
```

### `ExportController` reads the retry limit of the shop
…

### `ReadInvoiceOwner` in the billing context returns the ID of the invoice's shop
…

### `UploadRetryPolicy` stops a 4th upload
…
````

- The renderer fails on a `steps` block that has any lines. A step always has
  the title of its passage. So the text of a step can't be different from the
  title of its passage.
- To change the text of a step, change the title of its passage.
- The `> ⚠️` blocks aren't in the chain, because they aren't numbered.

The renderer also adds 3 things that you don't write in the source:

- a link on every name in backticks that a changed file exports
- a link on the path of every changed file
- the last tab, "Every file", which lists each changed file next to the points
  where the file is shown

### Notes on lines of code

A note explains one line of a code block or a few lines of the block. Write
` //~ ` at the end of the line, followed by the note:

````markdown
```ts modules/exports/src/application/export-invoice.handler.ts
const policy = UploadRetryPolicy.fromAttempts(command.attempts) //~ the limit is read from the shop's settings
```
````

When a note is about several lines, write ` //~[ ` at the end of the first
line, followed by the note. Then write ` //~]` at the end of the last line.
The lines in between don't need a marker. A `…` line can also be one of them:

````markdown
```ts modules/exports/src/application/export-invoice.handler.ts
if (policy.isExhausted(attempts)) { //~[ a 4th upload is never tried
  return new UploadRetriesExhausted()
} //~]
```
````

The renderer numbers the notes of each code block from 1. Each note is shown
in 3 places:

- A numbered badge is drawn in the gutter of the note's first line. Every line
  of the note has a green wash.
- A numbered list above the code block shows the text of each note and the
  lines that the note is about.
- A card is opened by hovering over the badge or by clicking the badge. The
  card is drawn under the last line of the note, or above the first line when
  there's more room above. That way the card is never drawn over the lines of
  the note.

The renderer fails on a note on several lines that isn't written correctly:

- a `//~]` that doesn't end a note that was started with `//~[`
- a `//~[` without any text, or a `//~]` with text after it
- a `//~[` or a `//~` while a note on several lines is still open
- a `//~[` that isn't ended with a `//~]` before the end of the block
- a `//~[` or a `//~]` on a `…` line

## The tabs

Each `# ` heading in the source is a tab on the page. The renderer adds a 4th
tab, "Every file", at the end. You can write these 3 tabs in the source:

1. **The change.** This tab contains the points from step 2, in the order the
   code runs. The text before the first `## ` heading is the overview. Put the
   `flow` block there, followed by the `types` block.
2. **Architecture.** This tab contains what changes between contexts rather
   than inside one context:
   - a new dependency between 2 contexts or 2 packages
   - a new API port or SPI port
   - a new export from the `index.ts` of a context
   - a new table or a new queue that another context can read
   - a new event that another context can read

   A new dependency in a `package.json` belongs here even though the file is
   config, because a reviewer reads the dependency as coupling between 2
   contexts.
3. **Docs and config.** This tab contains everything that isn't code or
   architecture:
   - documentation, such as a README or an ADR
   - a glossary
   - config, such as a lint rule or a coverage threshold
   - a pipeline file
   - generated files and the source that each one is generated from

Leave out a tab that would be empty.

Mark anything that has a wide impact with `> ⚠️`, whichever tab it's on. The
overview lists every `> ⚠️` block from every tab so Nick sees all of the
warnings before he opens a point. A new dependency between contexts, a lower
coverage threshold and a changed coding convention are all examples of a wide
impact.

Give each `## ` heading a short label in braces. The top of every point has a
timeline, which is a row of numbered points. The full heading doesn't fit in
the timeline so the label is shown there instead:

```markdown
## The export job retries a failed upload {Retry}
```

## How to write a point

Each entry below is about one mistake that makes a point harder to review.
Most entries start with what to write instead and why. Then they describe
where the mistake usually happens. Some of them also describe where the entry
doesn't apply.

Each entry describes the usual case. So use your judgment rather than
applying an entry to every sentence.

### A passage that shows code without saying why the code matters

Write each passage as Point, Explain, Evidence so that Nick knows why a block
of code matters before he reads the code. Without the point first, the block
would read as a dump of code. Nick would have to work out for himself what it
changes.

1. **Point.** The `### ` title states the point of the passage, such as what
   changes for a caller or for a reviewer.
2. **Explain.** The paragraph under the title describes in plain words how
   the code makes that change and why. Write the context of each thing at its
   first mention.
3. **Evidence.** Then show the code block. Put a ` //~ ` note on each line
   that the explanation refers to.

This mistake is common in a passage whose title describes what the code is
rather than what the code changes.

**Bad:**

```markdown
### This import is new in this MR
```

followed only by the import of `GetInvoiceOwner`.

**Good:**

```markdown
### An export of an invoice that another shop owns fails with a 403

The export route in the exports context asks the billing context which shop
owns an invoice. The call goes through `GetInvoiceOwner`, which is a new SPI
port in the exports context.
```

followed by the import, the call to `GetInvoiceOwner` and the line that
returns the 403, which has a note.

### Each point is built to be read on its own

Build each point so that it can be read without the other points, because a
point is one screen of the page and Nick will read the screens in any order.
He'll also jump straight to any passage on a screen. That's why each passage
is built so that it can be read without the passage above it too.

1. **Open the point with an intro that describes what the point is about.**
   The intro doesn't refer to the previous point.
2. **Write a breakdown after the intro** if the point has 3 or more passages.
   These are the usual cases, but use your judgment for each point:
   - A point that follows one call through the code has a `steps` block
     after its intro paragraphs as described in "The source format".
   - Any other point has a table of contents, which is a numbered list after
     its intro paragraphs. Each item is
     `[<label>](#<passage id>): <description>`. The label is a noun phrase
     that makes sense without any text around the label, such as "2 new SPI
     ports". The description explains in plain words what the passage shows
     and how the passage fits with the others.
   - Like the `steps` block, the table of contents lists every passage of
     the point in order. Item 1 links to passage 1, item 2 links to passage 2
     and so on. The renderer will fail if the items aren't in the order of
     the passages.
   - Don't start a label with "the" if the thing hasn't been
     introduced on the same screen yet. Don't write a sentence that has a
     label as its subject and continues after the link either.
3. **Make the title of each passage its point.** If you link to an earlier
   passage, write the link in the paragraph and write about the code rather
   than about the page. Never write "the passage on", "the introduction",
   "showed" or "described" about the page itself. Don't set up a passage at
   the end of the passage above either, because the reader might not have
   read that passage.
4. **Start the context again in the paragraph under the title.** The title
   is a heading rather than the first sentence of the paragraph. So the
   paragraph under the title never continues from the title.

   Hide the title with your hand and read the paragraph alone. If any word in
   the paragraph only makes sense with the title, write the thing again in
   full and write its context. These words usually depend on the title,
   wherever they are in the paragraph:
   - "this", "that", "it" or "these"
   - "the reason" or "the same"
   - a "the" before a thing that only the title introduced

**Bad:**

> 1. [The 2 ports](#t1p3.b3) are listed with the context that each one calls.

"The 2 ports" haven't been introduced on the screen. The label is also the
subject of the sentence.

**Good:**

> 1. [2 new SPI ports](#t1p3.b3): the ports that the exports context calls and
>    the context that each port's adapter calls.

**Bad:**

> [The passage on 2 new SPI ports](#t1p3.b3) showed that the exports context
> asks the billing context for the owner of an invoice.

The title talks about the page rather than the code.

**Good:**

> The billing context reads the owner of an invoice from the invoice itself.
> The exports context calls the new [ReadInvoiceOwner API port](#t1p3.b3) in
> the billing context. Inside the billing context, `InvoiceOwnerHandler`
> implements `ReadInvoiceOwner` and never reads the shop.

**Bad:**

```markdown
### A 4th upload is never tried after 3 failures

The comment on the `UploadRetryPolicy` class in the exports context explains
this.
```

"This" at the end of the paragraph points at the title. If you hide the
title, you can't tell what the comment explains.

**Good:**

```markdown
### A 4th upload is never tried after 3 failures

The comment on the `UploadRetryPolicy` class in the exports context explains
why the export job doesn't try a 4th upload after 3 failed uploads.
```

This entry doesn't apply to a `> ⚠️` block, because its first sentence is
already the warning. A point with 1 or 2 passages doesn't need a breakdown,
because the reader sees all of the point at once.

### A passage that opens on a piece of code the reader didn't ask about

Start the passage with what is still missing before the point's goal is met.
Then introduce the code that adds the missing part. Then show the code.

This mistake usually happens in the middle of a point. The point's heading is
a goal, such as "The export job retries a failed upload". If the next passage
opened with "`UploadRetryPolicy` is a new value object in the exports
context", the reader wouldn't know yet why a value object is needed for that
goal. So the sentence wouldn't have any connection to anything they'd read.

**Bad:**

> `GetInvoiceOwner` is a new SPI port of the exports context. Its adapter
> calls the billing context.

**Good:**

> An export is only allowed for the owner of the invoice, but the owner is
> stored by the billing context. The exports context asks for it through a new
> SPI port called `GetInvoiceOwner`.

This entry doesn't apply to a point's heading, because the heading is the
goal.

### A paragraph that piles up every fact about the code under the paragraph

The renderer fails on any paragraph that has more than 4 sentences, because a
longer paragraph is a wall of text that's hard to read. In the entries above,
you're asked for the context and the dependency of everything in a block, as
well as the reason why each thing is there. If you were to write all of that
as one paragraph, you'd end up with about 8 sentences.

The point is in the passage's `### ` title. Keep the facts that explain the
point in the paragraph. Then move each other fact to the place where it
belongs:

- Turn facts of the same kind, such as one fact per dependency, into bullets.
- Turn a fact about one line of the block into a ` //~ ` note on that line.
- Move a fact about something else into a separate passage under a new
  `### ` title. The new passage shows the code that the fact is about.

Never get under the limit by joining sentences with "and" or by cutting a
thing's context.

### Steps and separate facts written as a paragraph

Write each step of the code being discussed as a numbered list because humans
find it easier to read a sequence of steps as a list instead of prose. Use
your judgment, though. For example, 2 short steps can read fine as one
sentence.

Separate facts about the code are usually easier to read as bullet points
too. A fact and the reason for it stay in one bullet, joined as one sentence.
A reason on a separate bullet reads like a separate fact, because a reason
only makes sense when it's joined to the sentence it explains.

1. Steps in a paragraph.

   **Bad:**

   > `UploadInvoiceAdapter` in the exports context implements
   > `UploadInvoice`, which is a new SPI port. It signs the file with the
   > shop's key and posts the file to the storage bucket. Then it checks the
   > ETag of the response against the checksum of the file.

   **Good:**

   > `UploadInvoiceAdapter` in the exports context implements
   > `UploadInvoice`, which is a new SPI port. These are the 3 steps of
   > `UploadInvoiceAdapter`:
   >
   > 1. It signs the file with the shop's key.
   > 2. It posts the file to the storage bucket.
   > 3. It checks the ETag of the response against the checksum of the file.

2. Separate facts in a paragraph.

   **Bad:**

   > `ExportController` is a new controller in the exports context. The
   > `exportInvoice` route is tagged `@Public()` so the auth guard lets a
   > caller without a token through. The retry limit is the number that is
   > returned by the billing context.

   **Good:**

   > - `ExportController` is a new controller in the exports context.
   > - The `exportInvoice` route is tagged `@Public()` so the auth guard lets
   >   a caller without a token through.
   > - The retry limit is the number that is returned by the billing context.

3. A reason on a separate bullet.

   **Bad:**

   > - The export job tries an upload 3 times.
   > - Because the storage bucket sometimes drops an upload.

   **Good:**

   > The export job tries an upload 3 times because the storage bucket
   > sometimes drops an upload.

### A paragraph whose sentences don't explain the code under the paragraph

Each sentence in a passage usually explains a line of the code block under
the passage or leads to the next sentence. If a sentence doesn't do either,
move it into a separate passage, which shows the code that the sentence is
about.

Some names in the code are too short to tell the reader what they are.
`method` and `reader` are examples. Write what the name stands for instead,
such as "the HTTP verb" or `readRetryLimit`.

### A new definition that is shown without one of its callers

Show one caller's code first. Put the definition of the new code straight
below that. A reviewer can't learn much from a definition on its own. A caller
comes first because the walkthrough is written from the outside in.

Put a ` //~ ` note on the line where the new code is called. If there are
several callers, show one of them and list the others.

Without a caller, the reviewer would see that a method was added to a
controller, but they couldn't see that anything calls the method. The text
often claims that the new method is used, as in "each of the 4 routes calls
the new method", while the code block under that sentence only shows the new
method.

**Bad:** a passage with the new `#withRetry` method of `ExportController`,
followed by a passage about the port that `#withRetry` calls.

**Good:** a passage with `exportInvoice` calling `#withRetry`, with a note on
that line. Then a passage with `#withRetry` itself. Then the list of the
other 3 routes. Only then is there a passage about the SPI port.

This entry doesn't apply to code that's called by a framework, such as a
controller's route or a module's provider. Show the decorator or the
registration instead. It doesn't apply either to a type that's already used
in a block on the page.

### A code block that starts in the middle of a method

Show the signature line of the method that contains the code, even when the
point is only about a few lines in the middle. Replace each part that you
leave out with `…`. End the block with the line that closes the method. A
reviewer can only understand the lines once they know which method and which
class the lines are in. The parameters of that method also explain where each
variable comes from.

This mistake is usually made in a point about 2 or 3 lines of a long method.
The block then starts at those lines. So the reader sees an `if` and a
`return` without knowing which method they're in or where `attempts` comes
from.

**Bad:**

```ts
    if (attempts >= this.limit) {
      return UploadResult.gaveUp(attempts)
    }
```

**Good:**

```ts
  async upload(file: ExportFile): Promise<UploadResult> {
    …
    if (attempts >= this.limit) {
      return UploadResult.gaveUp(attempts)
    }
    …
  }
```

A function outside a class is shown in the same way. The block starts at the
`function` line and ends at the line that closes the function.

### Several names of the same kind inside one sentence

Write 3 or more names of the same kind as a list rather than inside a
sentence. A reader scans a column of file names faster than a sentence. Each
name also becomes a link on its own line.

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

This is only for names that are the same kind of thing and that the reader
might want to open. Examples are files and classes. Routes and tests are
examples too.

If there are only 2 names, leave them in the sentence. If each name has a
second fact, such as the action that each handler checks, use a table instead
of bullets.

### Using a vague word when there is a precise technical word

Use the most precise and accurate technical word for the thing. Pick the word
that a developer would say out loud.

**Bad:**

> A save is also refused when the order doesn't have an owner.

The reader can't tell what "a save" is. It could be the route that saves an
order, the `saveOrder` method of `OrderController`, the `SaveOrder` use case
or a write to the database.

**Good:**

> The `SaveOrder` use case also refuses a caller when the order doesn't have
> an owner.

Write what kind of thing it is as part of the thing's name, such as "use case"
or "controller". You can leave the kind out where the sentence already makes
the kind clear. Without the kind, the reader would have to guess which layer
of the code the sentence is about.

**Bad:**

> All write methods check the owner.

"Write methods" could be database write methods, use case write methods or
controller write methods.

**Good:**

> All controller write methods check the owner.

The kind isn't needed in "`OrderController` checks that the user owns the
order in each of its write methods", because the word "its" already makes the
kind clear. Every method of a controller is a controller method.

### A thing mentioned without its context

The first time you mention a thing in a passage, write what kind of thing it
is and its context, such as "the `GetInvoiceOwner` SPI port in the exports
context". For the rest of the passage, just use its name. Write the context
again in the next passage, because each passage is a separate section on the
page.

This matters because a merge request can touch several contexts. Then a port
or an adapter without its context could be in any of them. Some names even
exist twice, such as a `GetOrder` port in both the BFF (the backend for one
frontend) and the orders context. A class whose name is unique in the merge
request still needs its context the first time, because the reader hasn't
learned the name yet.

### A code block that calls another context without the text announcing the call

Announce a call to another context in the text above the code block that
shows the call.

Say a method in the exports context contains `this.getInvoiceOwner.apply(…)`.
The call looks local, but `getInvoiceOwner` is a port whose adapter calls the
billing context. So that line creates a dependency between 2 contexts. For a
reviewer it's the most important fact in the block, but the line on its own
doesn't show the dependency.

A dependency like this one is why every piece of the page shows its context.
Explain the dependency in the passage that shows the line rather than in a
later passage. Never leave the dependency out.

In the text above the block, describe:

- which other context the code depends on
- which port the call is made through
- which context the called port belongs to
- whether the dependency is new in this merge request

Then show the call in the block. Include the `import` line and the line where
the SPI port is injected. If the path in the `import` doesn't show what the
name is, put a ` //~ ` note on that line.

A dependency that's new in the merge request is also a point on the
Architecture tab, under a `> ⚠️` block. Refer to that tab in the passage.

**Bad:**

> The new method reads the owner of the invoice and then runs the export.

followed by a block with only the body of `#exportForOwner`.

**Good:**

> The new `#exportForOwner` method in the exports context is where the
> exports context starts to depend on the billing context. The dependency is
> new in this merge request and is on the Architecture tab. The method reads
> the owner of the invoice from the billing context through
> `GetInvoiceOwner`, which is a new SPI port in the exports context.

followed by a block with the `import` of `GetInvoiceOwner`, the constructor
line where `GetInvoiceOwner` is injected and then `#exportForOwner`.

A call to code in the same context doesn't need any of this. A use case that
calls its own repository is an example.

If a dependency on another context already existed before the merge request,
still write its context in the text. One clause is enough there. There's no
need for a warning either.

There's usually no need to show the import of a framework decorator, or of a
helper whose name already describes what the helper does.

### Something in a code block that the text didn't prepare the reader for

If a code block contains something surprising, either describe the surprise
and its reason in the text above the block or replace the surprising lines
with `…`. A surprise is something like a constant called
`PLACEHOLDER_SHOP_ID`, a `TODO`, a thrown error or a cast. If the walkthrough
didn't explain the surprise, the reader would stop and ask whether it's a
problem.

Lines that are ordinary for the file don't need a description. Imports and
constructors are usually ordinary lines like that. So are decorators. An
import from another context is the exception, as described in "A code block
that calls another context without the text announcing the call".

### A repeated change shown several times, or shown once without its exceptions

When the same change is made in several places, show one of them in full.
Then list the others and write that they have the same change. If the same
change was made in 6 handlers, for example, the reader wouldn't learn anything
from a second code block.

Before you write that they're the same, compare all of them, because the
defects are usually in the exceptions. If one place differs, show its code
under a `> ⚠️` block that describes how it differs. If the copies only differ
by a name, such as the action that each handler checks, a table of the names
is enough.

### A change at the boundary of a context that is left out or only implied

Show every change at the boundary of a context, even if it's only one line,
because a reviewer nearly always wants to see these changes. A new port, a new
export from an `index.ts` and a new dependency in a `package.json` are each a
contract between 2 contexts. Show the declaration of a new port and write
which context calls which.

A private method, a new file inside one context or a renamed local variable
isn't a boundary change. Show a change like that only where the point would
be unclear without the change.

### A sentence that isn't proved by the code

Prove every sentence with the code. Never write "I think", "probably" or
"should".

If a sentence is a consequence rather than something you can see in one file,
such as "a real user is never blocked today", prove it first. Show the lines
that the sentence follows from. If there's a test for that behaviour, show the
test too.

If you can't prove the sentence, stop and ask Nick. In auto mode, keep the
sentence and start it with `[USER INPUT REQUIRED]`.

### A decision that applies to the whole change rather than to one file

Write a decision that applies to the whole change as the second paragraph of
the tab. The paragraph only needs 2 or 3 sentences. Refer to the decision
again in the point where it's implemented.

An example would be "the shop id is never passed down as a parameter". A code
block can't show a decision like that, because the decision is about what
isn't there. Without the decision, the reader can't tell why some of the code
exists.

Most merge requests don't have a decision like this. Don't invent one for
them.

## The page

Nick will read the page on a laptop. `walkthrough.css` and
`render-walkthrough.mjs` are built around the constraints of a laptop screen,
which are listed below. If you change either file, keep to these constraints:

- **The code is always fully visible**, because Nick can't review a line that
  he can't see. A long line wraps. A code block never scrolls sideways and
  it's never clipped.
- **Text is above its code rather than beside the code.** A laptop screen is
  too narrow for a column of text next to a column of code. The code would be
  squeezed into half of the width.
- **The page has one column**, because a laptop screen doesn't have room for a
  sidebar next to the code.
- **Body text is dark on white.** Grey text on a grey background is hard to
  read. Only a label, such as a line number or a path, is grey.
- **There's one point per screen**, because a reader who saw 7 points and 40
  code blocks on one scrolling page wouldn't know where to start.
- **The timeline is on every screen.** Showing one point per screen hides the
  overall story. That's why the row of numbered points is at the top of every
  screen. The timeline shows which point is open, which ones have been read
  and which ones have a warning.
- **The overview shows the whole change at a glance.** It has these parts:
  - the summary
  - every warning from every tab
  - the sequence diagram and the type diagram
  - the list of points, with one line for each point

  A warning that's only visible inside a point is a defect.
- **The colour of a context is a faint tint.** Each context has a separate
  hue. The badge is a light tint of that hue with dark text. A strong
  colour on every badge would draw the eye away from the text and the code.

Look at the page before you show it to Nick. Take a screenshot at the size of
a laptop screen and read the screenshot:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --window-size=1440,900 --screenshot="$dir/check.png" "file://$dir/walkthrough.html#t1p2"
```

## Rules

- **Never post anything to GitLab.**
- **The page is the deliverable.** Tell Nick the path rather than writing the
  walkthrough out in the chat as well.
- **Keep the folder**, because Nick's feedback contains the folder's path. If
  the folder was deleted, the paths in his feedback wouldn't open any more.
  Nick will clear out the old folders under `~/nick-walkthrough/`
  himself.
