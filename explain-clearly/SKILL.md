---
name: explain-clearly
description: Explain code, a problem, an idea or a decision so that the reader understands it on the first read. Use it whenever a reply explains how code works, why something happens, what a change does or what a review found. Use it whenever Nick has to decide something too. Also trigger on "/explain-clearly", "explain", "why", "how does", "what does", "walk me through", "I don't understand what you mean" and "what are you talking about?". Every explanation follows Point, Explain, Evidence (PEE). A decision ends with a list of options, their trade-offs and a recommendation.
---

# Explain clearly

Problem: agents don't communicate ideas clearly to humans. They tend to throw out lots of details which leaves the narrative and key points unclear or hidden. This skill is a set of guidelines for making or restructuring content to make it easier for humans to read.

Every explanation follows Point, Explain, Evidence (PEE). 

1. **Point**: What is the key idea of a piece of content? Is there a problem to solve, a goal to be achieved, a topic to be explore? Make that point straight away as clearly as possible to the reader so that they can relate everything that follows to the key point.

2. **Explain**: Explain the key point in more details. This might include:
 - explain some of the terms and concepts introduced
 - explain the significance of the problem
 - mention who is affected and why

3. **Evidence**: Provide evidence to support the key point. This could be statistics, quotes, observations, or an honest admission that it's just a hunch and there is no evidence yet.

Example:

[point] Working with agents is frustrating because they don't communicate clearly. It's really annoying and affects productivity and makes humans dislike their job.

[explain] Humans interact with agents in a chat-based window. Agents will dump lots of information there which humans have to read and piece together in their head. A conversation may have various threads and references back to previous points. 

An agent may ask a question or make a point and the user is left wondering, how does that relate to the previous comment I just made? They can be lost. Or they have to hold some information in their head until they read more text and it all makes sense. This cost of holding things in the head uses up the human's cognitive load

[evidence] An agent started a section with this "I think the fixes have to be started from this session". The reader is thinking "what fixes? why are we talking about this session?". Neither of those concepts has yet been introduced or explained so the reader doesn't understand it.

Another bad example is a section that begins "The transaction check can't be merged yet,". Again, the user is wondering what transaction check? The agent is starting a section by talking about concepts that haven't been introduced yet.

## The rules

### The heading is the question

Write the main heading of each topic as a question for the reader. Put ❓
before it so the start of each topic is easy to see. When there isn't anything
to decide, write the question the reader would ask. The headings under a
topic, such as "Proposed options", the option headings and the recommendation
heading, don't get a ❓.

**Bad:** Currency export

**Good:** ❓ Should the billing module export `Currency`?

The good heading tells the reader what they are deciding before they read a
word of the explanation.

### Start with the key idea

Every section must follow PEE. You are writing to be understood by the reader, not journalling your work or dumping your internal monologue. If you mention something the user won't understand, you've failed.

### Show the code rather than describe it

When the point is about code, show the code. A sentence that describes a
constructor makes the reader imagine it, but a snippet shows it.

1. Show the code straight after the sentence where it is mentioned. Never
   mention a function, a class or a file in one paragraph and show it in a
   later one, because the reader has to remember the name until the code
   turns up.
2. Write the file path and the line number in the line that introduces the
   block so the reader doesn't have to look for them anywhere else.
3. Show only the relevant lines, with `// …` where code is left out.
4. Write a before and after as 2 separate blocks. Label each one.
5. Say in the introducing line whether the block shows today's code or a
   proposal.

Don't say "that function" because it's ambiguous and makes the reader work. Always say the name explicitly `startJob()`

### Draw a chain of calls as a tree

When an explanation follows a chain of 3 calls or more, draw the chain as a
tree in a code block, before the first code block of the explanation. The
reader can then see how the steps fit together before they read the code of
each one.

1. Start the tree with the method at the top of the chain. Write its file and
   its line on the same line.
2. Give each call that the explanation shows a number, like ①, ② and ③.
3. Write the line number next to each call. Write "🆕 proposed" next to a call
   that doesn't exist yet.
4. When the tree has a proposed call, draw it in a `diff` code block. Start
   each line of a proposed call with `+` so that it's drawn in green. Start
   every other line with a space.
5. Show where an error is thrown, like "wrong count → throw
   CorruptInvoiceRow".
6. Introduce each code block below the tree with the number of its step, like
   "② The proposed `InvoiceRow.taxRate()`, in the same file:".

Never draw the chain as a Mermaid diagram, because the Claude app doesn't
render Mermaid in the chat.

Here is a tree for a method that reads an invoice back from the database:

```diff
  InvoiceRowMapper.toInvoice()                            invoice-row.mapper.ts:88
  │
  ├─ ① row.money(TOTAL)                                   :41
  │     └─ amount and currency code → Money.from()
  │
+ ├─ ② row.taxRate(TAX_RATE)                              🆕 proposed
+ │     └─ TaxRate.fromPercent()
+ │           └─ rate above 100 → throw CorruptInvoiceRow
  │
  └─ ③ row.lines()                                        :57
        ├─ value(LINE_COUNT)
        │     └─ wrong count → throw CorruptInvoiceRow
        └─ for each line
              ├─ money(line.price)
+             └─ taxRate(line.taxRate)                    🆕 proposed
```

### List the options with their trade-offs

Never give the reader one idea to approve or reject. List every realistic
option, which is usually 2 to 4 of them. Leaving the code as it is counts as
an option when it is a realistic one.

Put the options under their own heading, called "Proposed options", one level
below the question. Give each option its own heading one level below "Proposed
options", in the form "1️⃣ Option 1: <what the change is>". Start each option
heading with the number emoji that matches its number. Never write the
options as a numbered list. Under each option heading, write a short paragraph
that explains the change, then the proposed code, then a "Pros:" line and a
"Cons:" line.

Show the proposed code of every option that changes code. A sentence like
"add a function that parses the currency code" makes the reader imagine what
the code looks like. Show the proposed code instead, or at least its key
lines. Write the file path and the line where the code goes in the line above
the block.

After the last option, write a heading that says which option you recommend,
like "⭐ Recommendation: 1️⃣ option 1", at the same level as "Proposed
options". Under it, give the reason in one or two sentences. The reason is
about the trade-off so it says why the pros of that
option matter more than its cons.

### Write in simple language

Write short sentences, with words a colleague would say out loud. Use the
repository's own words rather than inventing a term. If there isn't a word for
something, ask before you write the explanation.

### Use a list when there are several things

When a sentence says there are a number of things, like "the form has 3
steps", write the things as a list straight after it. Do the same when a
sentence names 3 things or more in a row. End the line before the list with a
colon. Use a numbered list when the order matters, like the steps of a form.
Use bullet points otherwise.

**Bad:**

> The refund form that a customer fills in has 3 steps. Step 1 is where the
> customer picks the invoice. Step 2 is where the customer picks the lines to
> refund. Step 3 is the payout.

**Good:**

> The refund form that a customer fills in has 3 steps:
>
> 1. The customer picks the invoice.
> 2. The customer picks the lines to refund. The code calls this step "refund
>    lines".
> 3. The customer chooses how the money is paid back.
>
> Steps 2 and 3 each start with a note. The billing team sets these things on
> each note:
>
> - The team writes the text of the note.
> - The team picks a colour for the note.
> - The team decides whether the note is shown.

### Give each question its own heading

When there is more than one question, each one has its own heading with its
own explanation, evidence and options. Never put 2 decisions under one
heading, because the reader has to read both before they can decide either of
them.

### Split a long section with subheadings

When a section has more than 3 paragraphs under one heading, split it into
parts. Give each part its own subheading, one level below the heading of the
section. The subheading says what the part is about, like "Reading an invoice
back from the database builds `Money` values". Code blocks don't count as
paragraphs.

### Read it as a fresh reader

Write for a colleague who hasn't seen this conversation. They don't know which
files you read, what you tried or what was decided earlier. Before you send
the explanation, read it again as that colleague and check these 3 things.

1. **Every name is introduced before it's used.** A function, a file, a rule
   or an option is explained the first time it appears. The reader should
   never meet a reference to something they haven't seen yet.
2. **Each of the reader's questions has a reply.** Think of the 3 questions a
   colleague would most likely ask after the first read, like "what breaks if
   we don't do this?" If the explanation doesn't contain the reply to one of
   them, add it.
3. **The conversation isn't assumed.** Look for words that only make sense to
   somebody who was there, like "the earlier fix", "as discussed", "the second
   approach" or "that rule". Replace each one with the thing it refers to.

## Lessons from explanations that Nick rejected

Each lesson below is a mistake that Nick rejected, followed by the fix he
accepted.

### The structure of the document

#### Open with the conclusion

The first paragraph states what you think is true, in 1 or 2 sentences. It
doesn't open with what the reader has to do or why you're asking them.

**Rejected:** I need you to decide whether `npm run check:modules` should fail
when a function in the code for the reporting database has a parameter of the
type `Knex.Transaction`. It fails on that code today.

**Accepted:** I think `checkTransactionParams` fails on code that is fine. It
fails on a `trx` in a repository of the reporting database, but another module
can't use that `trx`.

#### List the steps of the argument as links

After the first paragraph, list the sections as numbered steps. Each step
links to its section. Each section heading has the same number as its step.
The reader then knows why the sections come in that order and what each one
adds.

**Accepted:** I'll walk through this in 3 steps: 1. [How the check stops a
transaction spanning 2 modules](#) 2. [How the check fails on a repository of
the reporting database](#) 3. [Why `InvoiceStore` can't make a transaction
span 2 modules](#)

#### Restructure rather than cut

When a paragraph is too long, split it into a list or into sections. Don't
delete facts to make it shorter.

### Each section

#### Open a section with its point

FOLLOW PEE

#### State the rule, then give the example

PEE applies everywhere, at the high level structure and for each section. For example, when writing about rules. Start with the key point, then explain it.

The rule is written in general terms. The example comes after it, introduced
by "For example". The name of a context or a class in the example never goes
into the rule.

**Rejected:** Another module can't call a function in `reporting-store/` of
`billing` so it can't get the `trx` of a transaction that `billing` opened
there.

**Accepted:** A module can't call a function in the `reporting-store/` folder
of another module. As a result, it can't get the `trx` of a transaction that
the other module opened in that folder. For example, `orders` doesn't have
any way to get the `trx` in the invented `InvoiceStore.save()` from the
previous section.

#### Make a callback to an earlier section explicit

A section never opens with "this" or "that" for something in the section
before it. Write "as described in the previous section" or "from step 2".

**Rejected:** Another module can't call `saveInvoiceLines()` so `orders` can't
write in this transaction.

#### Join sentences with connectors

Write "As a result", "This means" or "For example" between sentences that
depend on each other. A row of bare facts leaves the reader to work out how
they connect.

**Rejected:** `orders` can't call `saveInvoice()`. A module can only import
what another module exports from its `src/index.ts`.
`modules/billing/src/index.ts` doesn't export anything from
`reporting-store/`.

#### Put a reference and its content in one sentence

**Rejected:** The card has this criterion. A database transaction never spans
2 modules.

**Accepted:** The story "Each module opens its own database transactions" has
the following criterion: no database transaction spans two modules.

#### Write the concrete consequence

A phrase like "stays inside its context" or "the rule it was written for"
leaves the reader to guess. Write what happens, with the names of the things.

**Rejected:** A transaction in either folder stays inside its context. So the
check fails on code that doesn't break the rule it was written for.

### Code and claims

#### Show the code rather than describe it

A list of checks written as prose was rejected. The accepted version shows the
code that breaks the rule, the command that was run and its output.

**Rejected:** These 3 checks in `tools/lint/module-rules.mjs` stop that: 1.
`checkPublicApi` at line 412 fails if …

#### Prove each claim by running it

A claim like "`checkTransactionParams` stops this" needs proof. Add the
code that breaks the rule, run the check, paste the output and remove the code
again. Say in the label of the code block that the code was added for the
test.

#### Give every code block a real location

A code sample without a file path isn't an example of anything. An example
quoted from a card isn't code in the repository.

#### Build an invented example on real code

An invented example follows the conventions of the repository. Write it as a
change inside a real method of a real class. Label it "invented change". A
block of code that doesn't belong to any function was rejected.

**Accepted:** an invented change to `InvoiceStore.save()` in
`modules/billing/src/reporting-store/invoice-store.ts`.

#### Use precise verbs

Don't use "show" for everything. Use "describe", "explain", "walk through" or
"convey", depending on what the text does.

## Example

This is the shape of a whole explanation. 

```markdown
## ❓ Should the billing module export `Currency`?

`invoice.spec.ts` can't construct the invoices it needs, because the
constructor of `Invoice` needs a `Currency`.

The constructor of `Invoice`, as it is today, in src/billing/invoice.ts:42:

<the constructor>

The [billing module]() doesn't export `Currency`. To get around this,
`fakeInvoice()` casts plain objects to `Invoice`, which means the field values
aren't type checked.

`fakeInvoice()`, as it is today, in src/billing/invoice.spec.ts:56:

<the workaround>

### Proposed options

#### 1️⃣ Option 1: Export `Currency` and delete `fakeInvoice()`

The billing module exports `Currency` so `invoice.spec.ts` can build every
invoice through the real constructor.

The proposed export, in src/billing/index.ts:3:

<the export of Currency>

Pros: the compiler checks every field of every invoice in `invoice.spec.ts`.
Cons: `Currency` becomes part of the public API of the billing module so
other modules can import it too.

#### 2️⃣ Option 2: Keep `fakeInvoice()`

The code stays as it is today.

Pros: the public API of the billing module doesn't change.
Cons: the objects in `invoice.spec.ts` aren't type checked so a renamed field
won't fail the build.

#### 3️⃣ Option 3: Give `Invoice` a static factory

The factory takes the currency code as a string and builds the `Currency`
inside the billing module.

The proposed factory, in src/billing/invoice.ts:58:

<the static factory>

Pros: `Currency` stays private to the billing module.
Cons: `invoice.spec.ts` is the only caller of the new factory.

### ⭐ Recommendation: 1️⃣ option 1

I'd go with option 1, because a renamed field should fail the build. Other
modules can safely use a small value object like `Currency`.
```

## Check before sending

Before you send the explanation or point Nick at its file, start a subagent
that hasn't seen the conversation. Give it the path of this skill and the path
of the file. Ask it to check the file against every rule of this skill, to
report each break with its line and not to edit the file. Fix what it reports,
then send.
