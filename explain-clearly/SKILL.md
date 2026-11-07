---
name: explain-clearly
description: Explain code, a problem, an idea or a decision so that the reader understands it on the first read. Use it whenever a reply explains how code works, why something happens, what a change does or what a review found. Use it whenever Nick has to decide something too. Also trigger on "/explain-clearly", "explain", "why", "how does", "what does", "walk me through", "I don't understand what you mean" and "what are you talking about?". Every explanation follows Point, Explain, Evidence (PEE). A decision ends with a list of options, their trade-offs and a recommendation.
---

# Explain clearly

An explanation written by an agent often starts with the details and leaves
the reader to work out what the question is. The reader has to picture code
from a description, hunt for the file it is in, and guess what they are being
asked to do. This skill is the structure every explanation follows, so that
the reader understands the context, sees the details that matter, and knows
exactly what they need to decide.

Every explanation follows Point, Explain, Evidence (PEE). When there is a
decision to make, the options come after the evidence.

1. **Point.** The heading is a question, with ❓ before it.
2. **Explain.** The first paragraph says what the key idea is, why it matters,
   and what problem it causes.
3. **Evidence.** The code is shown as proof. Each block has its file path and
   line.
4. **Options.** Each realistic option is listed with its trade-offs. Then one
   of them is recommended, with the reason.

## The rules

### The heading is the question

Write the main heading of each topic as a question for the reader. Put ❓
before it, so the start of each topic is easy to see. When there isn't anything
to decide, write the question the reader would ask. The headings under a
topic, such as "Proposed options", the option headings and the recommendation
heading, don't get a ❓.

**Bad:** Currency export

**Good:** ❓ Should the billing module export `Currency`?

The good heading tells the reader what they are deciding before they read a
word of the explanation.

### Start with the key idea

The first paragraph says what the problem is, why it matters and what it
costs. When the first paragraph mentions a piece of code, end the paragraph
there and show the code. Then continue the explanation after the block.

### Show the code rather than describe it

When the point is about code, show the code. A sentence that describes a
constructor makes the reader imagine it, but a snippet shows it.

1. Show the code straight after the sentence where it is mentioned. Never
   mention a function, a class or a file in one paragraph and show it in a
   later one, because the reader has to remember the name until the code
   turns up.
2. Write the file path and the line number in the line that introduces the
   block, so the reader doesn't have to look for them anywhere else.
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
   each line of a proposed call with `+`, so that it's drawn in green. Start
   every other line with a space.
5. Show where an error is thrown, like "wrong count → throw
   CorruptProductContent".
6. Introduce each code block below the tree with the number of its step, like
   "② The proposed `ContentRead.richText()`, in the same file:".

Never draw the chain as a Mermaid diagram, because the Claude app doesn't
render Mermaid in the chat.

Here is a tree for a method that reads the content of a product page:

```diff
  ReadProductContentAdapter.storedContent()               product-content.adapter.ts:209
  │
  ├─ ① read.text(PRODUCT_TITLE)                           :162
  │     └─ value() for each language → LocalisedText.of()
  │
+ ├─ ② read.richText(PRODUCT_DESCRIPTION)                 🆕 proposed
+ │     └─ RichText.fromMarkdown() for each language
+ │           └─ invalid text → throw CorruptProductContent
  │
  └─ ③ read.sections()                                    :172
        ├─ value(FEATURE_COUNT)
        │     └─ wrong count → throw CorruptProductContent
        └─ for each section
              ├─ text(slot.title)
+             └─ richText(slot.text)                      🆕 proposed
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
about the trade-off, so it says why the pros of that
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

> The checkout form that a customer fills in has 3 steps. Step 1 is where the
> customer checks the basket. Step 2 is where the customer gives their details.
> Step 3 is the payment.

**Good:**

> The checkout form that a customer fills in has 3 steps:
>
> 1. The customer checks the basket.
> 2. The customer gives their details. The code calls this step "customer
>    identity".
> 3. The customer pays.
>
> Steps 2 and 3 each start with a header. The shop manager sets these things
> on each header:
>
> - The manager writes a title in each language.
> - The manager writes a description in each language.
> - The manager decides whether the title and the description are shown.

### Give each question its own heading

When there is more than one question, each one gets its own heading with its
own explanation, evidence and options. Never put 2 decisions under one
heading, because the reader has to read both before they can decide either of
them.

### Split a long section with subheadings

When a section has more than 3 paragraphs under one heading, split it into
parts. Give each part its own subheading, one level below the heading of the
section. The subheading says what the part is about, like "Reading the page
texts back from storage builds `RichText` values". Code blocks don't count as
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

## Example

This is the shape of a whole explanation. The code blocks are placeholders.

```markdown
## ❓ Should the billing module export `Currency`?

`invoice.spec.ts` can't construct the invoices it needs, because the
constructor of `Invoice` needs a `Currency`.

The constructor of `Invoice`, as it is today, in src/billing/invoice.ts:42:

<the constructor>

The billing module doesn't export `Currency`. To get around this,
`fakeInvoice()` casts plain objects to `Invoice`, which means the field values
aren't type checked.

`fakeInvoice()`, as it is today, in src/billing/invoice.spec.ts:56:

<the workaround>

### Proposed options

#### 1️⃣ Option 1: Export `Currency` and delete `fakeInvoice()`

The billing module exports `Currency`, so `invoice.spec.ts` can build every
invoice through the real constructor.

The proposed export, in src/billing/index.ts:3:

<the export of Currency>

Pros: the compiler checks every field of every invoice in `invoice.spec.ts`.
Cons: `Currency` becomes part of the public API of the billing module, so
other modules can import it too.

#### 2️⃣ Option 2: Keep `fakeInvoice()`

The code stays as it is today.

Pros: the public API of the billing module doesn't change.
Cons: the objects in `invoice.spec.ts` aren't type checked, so a renamed field
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

Read the explanation against each of these before you send it.

1. Is the main heading of each topic a question, with ❓ before it?
2. Does the first paragraph say the key idea, why it matters and what it
   costs?
3. Is every piece of code shown rather than described?
4. Is every piece of code shown straight after the sentence where it is
   mentioned?
5. Does every code block have its file path and line in the line above it?
6. When the explanation follows a chain of 3 calls or more, is the chain
   drawn as a numbered tree before the first code block?
7. When a sentence counts things or names 3 or more of them, are they
   written as a list?
8. Does every section with more than 3 paragraphs have subheadings?
9. Are the options under a "Proposed options" heading, each one with its own
   heading one level below it and its own pros and cons?
10. Does every option that changes code show the proposed code, or at least
    its key lines?
11. Does each option heading start with its number emoji, like "1️⃣ Option 1"?
12. Is one option recommended under a heading like "⭐ Recommendation: 1️⃣
    option 1", with a reason about the trade-off?
13. Did you read it as a fresh reader and fix every name, question and
    assumption you found?
