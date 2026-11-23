---
name: scratch-pad
description: Turn this conversation into collaboration on an HTML scratch pad. Nick starts the skill for a new scratch pad, for the conversation so far or for an existing scratch pad.
disable-model-invocation: true
allowed-tools: Bash(scratch-pad *)
---

# scratch-pad

You must now collaborate in scratch pad mode. The main chat window is only used for status updates and references to the scratch pad.

This skill turns an AI conversation into collaboration on an HTML scratch pad. You write the pages in Markdown. Nick reads them in his browser and comments on the text.

A small server on Nick's machine shows the pages in his browser and saves his comments in the scratch pad's folder. You read those comments and reply to them with the scratch-pad tool.

The tool is a command called `scratch-pad`, which is on the PATH. It only needs Node 24. Run it like this:

```bash
scratch-pad <command>
```

When the shell can't find `scratch-pad`, stop and tell Nick to run the setup command in [README.md](README.md#setup). Never search for the tool. Never run the tool from another path.

[reference.md](reference.md) has the details, like each command's options and what each command prints. The same file also describes what's in a scratch pad's folder and lists the design tokens for an `:::html` block.

## How Nick starts the skill

Nick has invoked this skill so you begin with the scratch pad rather than with a reply in the chat.

From now on, write everything for Nick on the pages of the scratch pad. That includes your replies, your analysis, your questions, your proposals and the decisions that Nick has to make.

Write everything on the scratch pad, including the side topics. A side topic like a bug in the tool or a spec for another agent is an [improvement](#log-an-improvement). Log it with `improve` instead of writing it to another folder. Then give Nick the link that `improve` prints.

The chat is only for short status updates, such as the address of the scratch pad or a link to the page that you've just changed. Never put the content itself in the chat. A question for Nick appears in the chat only as its title with a link to its page. Everything else about the question stays on the page, even if another instruction asks for a sentence about the problem in the chat.

Nick starts the skill himself in one of these 3 ways:

- **A new scratch pad at the start of a session.** Run `new` with the topic that Nick gives. Then run `start` and give Nick the address.
- **The current session as a scratch pad.** Run `new` and `start`. Then write the pages from what you and Nick have said so far. Set the goal and the tasks in the progress tracker.
- **An existing scratch pad.** Nick gives you its folder. Run `start`, `status` and `inbox --all`, then continue with the current task in the progress tracker.

### Link to everything that you mention in the chat

Nick can only open a page from the chat through a link. So every time you mention a page in the chat, write the name of the page as a Markdown link to the page's address in the browser. Do the same every time you mention one of these things:

- a heading
- a decision
- a thread
- the progress tracker
- the log of decisions
- an improvement

Never mention one of these things without its link, even if you only write an id like `d-1`.

Copy each address from the output of the tool rather than build it yourself. [The links](reference.md#the-links) in reference.md lists which command prints which link.

If the server isn't running, the tool won't print any links. It will print a line that tells you to run `start` instead. In that case, run `start` first. Then copy the address from a command that doesn't change anything, like `show`, `pages`, `outline`, `tasks` or `status`. Never run `decide`, `improve`, `reply` or `done` a second time only to get a link, because each run adds another entry to the scratch pad.

This is an example of a status update in the chat, with invented content. Everything that the update mentions is a link:

```markdown
I've replied to [your comment on "every night"](http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#c-1). I've also rewritten [How the job runs](http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md) because you picked the proposal in [Will the export job retry 8 times?](http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#d-1).
```

## Start a scratch pad

Create the scratch pad and start the server, then give Nick the address that `start` prints. This is an example with an invented topic:

```text
$ scratch-pad new "Invoice export"
created /Users/nick/scratchpads/2026-11-21-invoice-export
select it with --pad 2026-11-21-invoice-export or SCRATCH_PAD=2026-11-21-invoice-export
there aren't any links because the server isn't running (scratch-pad start --pad 2026-11-21-invoice-export)

$ scratch-pad start --pad 2026-11-21-invoice-export
started the server: http://127.0.0.1:4747/2026-11-21-invoice-export/
```

Pass `--pad <folder>` to every command after `new`, because an environment variable that you set in one command often isn't there in the next one. The only exception is `stop`, which doesn't take `--pad` because the same server shows every scratch pad.

Run `start` at the start of every session. If the server is already running, `start` won't start a second one.

When you begin or continue a scratch pad, run `inbox --all` once after `start`. It prints every item that's still waiting for you rather than only the new ones, because an earlier session might have printed an item and ended before the item was dealt with.

Set the progress tracker's goal and tasks straight away, because the tracker is the first thing that Nick looks for. This is an example:

```text
$ scratch-pad goal --pad 2026-11-21-invoice-export "Ship the invoice export job."
$ scratch-pad task add --pad 2026-11-21-invoice-export "Design the export job"
$ scratch-pad task start --pad 2026-11-21-invoice-export 1
```

`task done <n>` finishes a task and starts the next task that's still to do.

Keep the tasks as close as possible to the order they'll be worked on so that Nick can read the tracker from top to bottom as the journey of the scratch pad. If a new task belongs to a task that's already on the tracker, add it under that task with `subtask add`. Otherwise add it with `task add`, then move it to its place with `task move`:

```text
$ scratch-pad task add --pad 2026-11-21-invoice-export "Agree the retry limit with Jo"
$ scratch-pad task move --pad 2026-11-21-invoice-export 4 --before 2
```

The progress tracker is where Nick goes to find out what a task is about and what has been done on it. So the description of each task is a short overview, in your own words, of the key points of the task. Each key point is a signpost to the page where Nick can read the detail. The detail itself never belongs in the description.

Write the description with `task describe` when you add the task. Keep the description up to date while the task moves on. These guidelines are a sensible default:

- Write only the bullet points that are needed by a reader. The maximum is 5, but it isn't a target. A single bullet is often enough.
- If the steps of a task are all listed on one page, write 1 bullet that links to that page, because the page already structures the content for the reader. For example, the description of "Fix the export job" only needs this bullet: "The export job fails for 3 shops. [Fix the export job](fix-the-export-job.md) lists the 3 fixes and their states."
- Each bullet tells Nick one key point, like the problem, the solution options or the explanation of a key point. Then it links to the page where that key point is explained.
- Change a bullet when something significant happens on the task, like a new page that proposes options. Leave the bullets alone when the content only evolves, like a 4th and 5th solution on a page of options.

This is an example:

```text
$ scratch-pad task describe --pad 2026-11-21-invoice-export 1 <<'EOF'
- The job writes one CSV file per shop every night. [How the job runs](how-the-job-runs.md) shows the 3 steps.
- A slow shop can make an upload fail. [The retry limit](retry-limit.md) proposes 8 retries rather than 5.
EOF
```

When you mention a task in a page or in a description, write its id, like `<task:t-4>`, rather than its number or its title. The page shows the reference as a link that contains the current number and title of the task, like "2.1 Retry a failed export". The number of a task changes when a task is moved, but its id never changes. `tasks` lists the id of every task.

## Write the pages

Each page is a Markdown file in the scratch pad's `pages` folder. The first page is `pages/index.md`. You edit the files with your normal tools and the page in the browser changes as soon as you save a file.

The server builds the sidebar and the table of contents from your headings. It also builds the frame around the text, which means you never write any HTML around the text yourself.

Follow these rules on every page:

- Write plain Markdown by default, because most pages only need text and tables.
- Start every page with one sentence under its title that describes the page, because the table of contents shows that sentence. Don't write an abbreviation with a full stop in that sentence, like "e.g.", because the table of contents cuts the sentence off at the first full stop.
- Link to another page without its number so that the link still works after the page is renumbered. This is an example: `[the retry limit](retry-limit.md#wait-between-retries)`.
- Keep a bullet point to one or two sentences. Write a longer point as a paragraph or a section.
- Write a proposal in its own `:::decision` block rather than in a bullet point.
- Write `index.md` as the introduction of the scratch pad. Write a few paragraphs about the topic of the scratch pad and link to a content page for anything more.
- Don't write the "Introduction" heading or the "Table of contents" heading on the index page, because the server adds both headings as well as the table of contents itself.

### Number the pages

The pages of a scratch pad tell a story that Nick reads in order. You decide that order with a number at the start of each file name, like `pages/1-how-the-job-runs.md`. The number of a sub page is the number of its parent page with a dot and one more number. So `pages/1.1-retry-limit.md` is a sub page of page 1 and `pages/1.1.1-wait-between-retries.md` is a sub page of page 1.1. Every file is in the `pages` folder however deep its page is. `index.md` is the only page that doesn't have a number.

Put a new page under the page whose topic it belongs to, rather than at the end of the top level. The sidebar and the breadcrumb show the topics of the scratch pad through the levels of the pages so a flat list of pages hides which pages are related. For example, a page that looks again at the options after Nick has changed a requirement is a sub page of the page about the requirements, like 2.1-without-paying.md under 2-what-the-factory-has-to-do.md. Only start a new top level page for a new topic.

You can give a page a new number at any time. However, the rest of the file name has to stay the same for as long as the page exists, because every link to the page and every comment on the page uses that name. The number isn't part of the page's address in the browser. For example, the address of `pages/1.1-retry-limit.md` ends with `retry-limit.md`. A new number for the page doesn't change that address.

### Ask Nick to decide something

Write the question as a heading and put a `:::decision` block with its own id under the heading. Nick then picks the proposal or the alternative with a button, or he writes a reply of his own instead. This is an example of a question on a page, with invented content:

<!-- prettier-ignore -->
```markdown
## Will the export job retry 8 times?

:::decision d-1
context: A slow network in the evening can make an upload fail. Read these in order:
  1. [How the job runs](how-the-job-runs.md#how-the-job-runs) shows where the upload happens.
  2. [The retry limit](retry-limit.md) explains why the limit is 5 today.
proposal: Raise the retry limit to 8.
alternative: Keep the retry limit at 5.
pick: proposal, because the network of a shop can be slow.
:::
```

Start the `context:` with a few words about the problem. Then add a numbered list of links to the sections that Nick should read before he decides, in the order that he should read them. After each link, write why the section matters for the decision.

If you reword the question, keep the same id. Give a new decision the next free id.

### Emphasise a key point

Use the `:::agent-note` block to emphasise a key point that Nick should be aware of. A key point in the middle of a paragraph is easy to miss, whereas the block shows the point in its own box with an "Agent note" label. For example:

```markdown
:::agent-note
This proposal hasn't been verified against the latest version of the library.
:::
```

### Draw something that Markdown can't show

Use an `:::html` block for a diagram or an animation. The block is shown in a sandboxed frame so its styles and scripts can't change the rest of the page. Use the page's design tokens rather than raw colours so that the block looks like the rest of the page. This is an example of a small diagram:

```markdown
:::html
<div style="display:flex;gap:var(--space-md)">
  <p style="padding:var(--space-xl);border-radius:var(--r-md);background:var(--accent-pale)">1. Read the invoices</p>
  <p style="padding:var(--space-xl);border-radius:var(--r-md);background:var(--tint)">2. Write one file per shop</p>
</div>
:::
```

Put a long block in its own file in the `custom` folder. On the page, write `:::html file=custom/export-steps.html` followed by a `:::` line.

## Talk with Nick through the page

Nick writes 3 kinds of thread on the text:

- a comment, which is for you
- a grammar note
- an improvement note

You deal with Nick's comments and his decisions yourself, but you hand both kinds of note to a subagent so that they don't fill your context.

### Wait for Nick

Run `wait` in the background and end your turn. Once Nick has been quiet for 10 seconds, `wait` will print the new items and end. In Claude Code, you run a command in the background with the `Bash` tool and `run_in_background`. If you can't run a command in the background, run `inbox` at the start of each turn instead. This is an example of what `wait` prints:

```text
$ scratch-pad wait --pad 2026-11-21-invoice-export
2 new items in 2026-11-21-invoice-export

[c-1] comment · pages/1-how-the-job-runs.md:3 · section "How the job runs"
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#c-1
  selected: "every night"
  Nick: Can a shop pick another time?
  block:
    3 | The export job writes the paid invoices of each shop to a CSV file every night.

[d-1] decision · pages/1-how-the-job-runs.md:9 · "Will the export job retry 8 times?"
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#d-1
  Nick chose: proposal

1 grammar note waits for a subagent
```

Each item includes the file and the lines of its block so you can usually edit the page without reading the whole file. When the inbox only prints the first lines of a thread, run `show <id>` to see the whole thread and its block.

Once you've dealt with every item, run `wait` in the background again and end your turn. Otherwise you won't see Nick's next comment until he writes in the chat.

### Reply to a comment

If Nick has asked for a change in his comment, change the page first and then reply in the thread. After your reply the thread waits for Nick, who is the only person that can resolve a thread. This is an example of a reply:

```text
$ scratch-pad reply --pad 2026-11-21-invoice-export c-1 "No. Every shop exports at 02:00, which I've added to the page."
c-1 now waits for Nick
link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#c-1
Run `wait` in the background before you end your turn.
```

### Follow Nick's decision

When Nick has decided, rewrite the text under the question so that it describes his choice. Leave the `:::decision` block where it is, because the page shows his choice in the margin beside the question. The decision waits for you until you close it with `done` and one line about the change. This is an example of how you close a decision:

```text
$ scratch-pad show --pad 2026-11-21-invoice-export d-1
[d-1] decision · pages/1-how-the-job-runs.md:9 · "Will the export job retry 8 times?" · waits for the agent
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#d-1
  Nick chose: proposal
Run `wait` in the background before you end your turn.

$ scratch-pad done --pad 2026-11-21-invoice-export d-1 "Raised the retry limit to 8 on the page."
d-1 is done
link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#d-1
Run `wait` in the background before you end your turn.
```

Don't run `reply` or `decide` for a decision, because a decision can't be replied to and the server has already logged Nick's choice. If Nick has written his own reply and it leaves something open, write the open point as a new question below the old one. Put a new `:::decision` block under the new question.

### Assign a task to Nick

Assign a task or a subtask to Nick only for work that blocks you and that only Nick can do. Never assign work that you could do yourself. These are examples of work that only Nick can do:

- work that needs credentials that you don't have
- an approval from Nick
- a command that has to run on Nick's machine

Write what Nick has to do in `--do` and why you can't do the work in `--why`. Put both of them in quotes. This is an example:

```text
$ scratch-pad task assign --pad 2026-11-21-invoice-export 3 --do "Run the export job on staging for one shop and open the file that it writes." --why "The agent can't log in to staging."
[t-2] task 3 is assigned to Nick: Ship the export job
link: http://127.0.0.1:4747/2026-11-21-invoice-export/progress-tracker#t-2
```

Never assign a whole task that has subtasks. Assign the subtasks that Nick has to do with `subtask assign` instead.

You can always add a subtask, even to a task that is assigned to Nick. In that case `subtask add` prints the question "Which subtasks does Nick have to do?". It also prints the `--do` and `--why` of the task so that you can reuse them for the subtasks that Nick has to do.

`status` and `check` will also report the task as a problem until you've assigned at least one of its subtasks. `status` prints the problem on a line that starts with `problem:`.

### Find out that Nick has done a task

Nick marks a task that is assigned to him as done in the browser. The server then starts the next task in the same way as `task done` does. After that, `wait` and `inbox` will print the task among the decisions. If the server has started a task, the last line of the item will describe that task. This is an example:

```text
[t-2] task 3 is done: Ship the export job
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/progress-tracker#t-2
  Nick marked it as done in the browser.
  [t-3] task 4 has started: Write the runbook
```

### Hand the notes to a subagent

When `wait` or `inbox` prints a line like `1 grammar note waits for a subagent`, start a subagent and give it the prompt below. Replace `2026-11-21-invoice-export` with your scratch pad's folder. If you can't start a subagent, fix the notes yourself once you've replied to the comments.

```text
Fix the grammar notes and the improvement notes that Nick wrote on the scratch pad 2026-11-21-invoice-export.
Run the tool as: scratch-pad <command>
1. Run: inbox --pad 2026-11-21-invoice-export --type grammar,improvement
2. Change the page file of each note in the way that Nick asks for. Only change the text that the note is about.
3. Close each note with: done --pad 2026-11-21-invoice-export <id> "<one line about what you changed>"
Don't reply to any comment, don't answer any decision and don't stop the server.
Only the main agent runs `wait` so ignore the line "Run `wait` in the background before you end your turn."
```

This is an example of what the subagent runs and what it sees:

```text
$ scratch-pad inbox --pad 2026-11-21-invoice-export --type grammar,improvement
[g-1] grammar note · pages/1-how-the-job-runs.md:7 · section "Will the export job retry 8 times?"
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#g-1
  selected: "can be slow"
  Nick: Write when it is slow.
  block:
    7 | The network of a small shop can be slow in the evening.
Run `wait` in the background before you end your turn.

$ scratch-pad done --pad 2026-11-21-invoice-export g-1 "Wrote that the network is slow in the evening."
g-1 is done
link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#g-1
Run `wait` in the background before you end your turn.
```

Nick still sees the closed note on the page. The note includes the line about the change.

### Log a decision

The server logs every decision that Nick makes on a page, whether he clicks a button or writes his own reply. But the server doesn't log a decision that Nick makes in the chat. Log that decision yourself. This is an example:

```text
$ scratch-pad decide --pad 2026-11-21-invoice-export "The export job runs at 02:00 for every shop."
decision 2 is logged
link: http://127.0.0.1:4747/2026-11-21-invoice-export/decisions
```

### Log an improvement

An improvement is a change to the harness, the skill, the tool or the UX rather than to the topic of the scratch pad. To log an improvement, run `improve` and provide a title of one sentence. Write the details in Markdown on standard input, for example through a heredoc. The details can be as long as you need. They can even be a whole spec. This is an example:

```text
$ scratch-pad improve --pad 2026-11-21-invoice-export "The export command skips the custom files." <<'EOF'
## Steps

1. Write custom/export-steps.html.
2. Run export.
3. Open export.html. The :::html block is empty.
EOF
improvement 1 is logged
link: http://127.0.0.1:4747/2026-11-21-invoice-export/improvements#improvement-1
```

If Nick asks you to change or remove an improvement, run `improvement edit` or `improvement delete` and provide the improvement's number. The edit command takes the new title and reads the new details from standard input. It replaces all of the old details so you have to write the details again in full, not just the part that changed:

```text
$ scratch-pad improvement edit --pad 2026-11-21-invoice-export 1 "The export command skips the custom HTML files." <<'EOF'
## Steps

1. Write custom/export-steps.html.
2. Run export.
EOF
improvement 1 is edited
link: http://127.0.0.1:4747/2026-11-21-invoice-export/improvements#improvement-1
$ scratch-pad improvement delete --pad 2026-11-21-invoice-export 1
improvement 1 is deleted
link: http://127.0.0.1:4747/2026-11-21-invoice-export/improvements
```

Nick sees each improvement on the Improvements tab of the browser page. The tab also lists every grammar note and improvement note that Nick has written on a page.

### Check a page before you tell Nick

Run `check` before you tell Nick that a page is ready. It prints each broken link, each broken `:::decision` block and each id that's used twice. It also prints each page whose number is missing or wrong. This is an example of what `check` prints:

```text
$ scratch-pad check --pad 2026-11-21-invoice-export
pages/1.1-retry-limit.md:3  the link points to pages/queue.md, which doesn't exist
pages/notes.md  the page doesn't have a number. Rename the file to <number>-notes.md, where the number is the place of the page in the order
2 problems in 4 pages
```

If the environment variable `SCRATCH_PAD_PROSE_CHECK` is set to a script, `check` will run that script on each page's text as well.

## Share a scratch pad

When Nick wants a file that somebody can read without the server, run `export`. The file shows the same pages as the browser, but a reader can't reply to anything in the file. Everything that the file shows is listed under [The export](reference.md#the-export) in reference.md. This is an example:

```text
$ scratch-pad export --pad 2026-11-21-invoice-export
exported 3 pages and 4 threads to /Users/nick/scratchpads/2026-11-21-invoice-export/export.html
```

Pass `--out <file>` to write the file somewhere else.

## Leave the server running when you finish

When you've finished, leave the server running, because another session might still be waiting for Nick on another scratch pad. So don't run `stop` unless you started the server yourself on purpose, for example to test the tool. Even after the server has been stopped, every scratch pad is kept in `~/scratchpads` so the next session can continue it with `start` and `inbox --all`.
