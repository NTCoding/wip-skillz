---
name: scratch-pad
description: Work with Nick on a page in his browser instead of in the chat. Use this skill for a scratch pad that Nick has asked for. Use it too for a long piece of work that Nick would want to comment on, such as a proposal or a plan. You write Markdown pages and a local server shows the pages in Nick's browser. Nick writes his comments on the text in the browser. You read his comments with the scratch-pad command and reply to them with the same command.
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scratch-pad/dist/scratch-pad *)
---

# scratch-pad

Nick finds a long answer easier to read on a page than in the chat. On a page he can also comment on the exact sentence that he means.

With this skill you write each page as a Markdown file in a folder. A small server on Nick's machine shows the pages in his browser and saves his comments in the same folder. You read those comments and reply to them with the scratch-pad command.

The tool only needs Node 24. Run it like this:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scratch-pad/dist/scratch-pad <command>
```

In this file, `scratch-pad <command>` is short for that line. The hints that the tool prints are written in the same short form. If you aren't running in Claude Code, replace `${CLAUDE_PLUGIN_ROOT}` with the root folder of this repo, which is the folder above this skill's folder.

You'll find the details in [reference.md](reference.md), like each command's options and what each command prints. The same file also describes what's in a scratch pad's folder and lists the design tokens for an `:::html` block.

## When to use a scratch pad

Use a scratch pad for work that Nick will comment on and change with you. Here are some examples:

- an analysis of a problem
- a proposal with options that Nick has to decide
- a plan with tasks that you'll work through together

A short answer or a quick question belongs in the chat.

## Start a scratch pad

Create the scratch pad and start the server, then give Nick the address that `start` prints:

```text
$ scratch-pad new "Invoice export"
created /Users/nick/scratch-pads/2026-11-21-invoice-export
select it with --pad 2026-11-21-invoice-export or SCRATCH_PAD=2026-11-21-invoice-export

$ scratch-pad start --pad 2026-11-21-invoice-export
started the server: http://127.0.0.1:4747/2026-11-21-invoice-export/
```

Pass `--pad <folder>` to every command after `new`, because an environment variable that you set in one command often isn't there in the next one. The only exception is `stop`, which doesn't take `--pad` because the same server shows every scratch pad.

Run `start` at the start of every session. If the server is already running, `start` won't start a second one.

When you begin or continue a scratch pad, run `inbox --all` once after `start`. It prints every item that's still waiting for you rather than only the new ones, because an earlier session might have printed an item and ended before the item was dealt with.

Set the progress tracker's goal and tasks straight away, because the tracker is the first thing that Nick looks for:

```text
$ scratch-pad goal --pad 2026-11-21-invoice-export "Ship the invoice export job."
$ scratch-pad task add --pad 2026-11-21-invoice-export "Design the export job"
$ scratch-pad task start --pad 2026-11-21-invoice-export 1
```

`task done <n>` finishes a task and starts the next task that's still to do.

## Write the pages

Each page is a Markdown file in the scratch pad's `pages` folder. The first page is `pages/index.md`. You edit the files with your normal tools and the page in the browser changes as soon as you save a file.

The server builds the sidebar and the table of contents from your headings. It also builds the frame around the text, which means you never write any HTML around the text yourself.

Follow these rules on every page:

- Write plain Markdown by default, because most pages only need text and tables.
- Link to another page with a relative link, like `[the retry limit](retry-limit.md#wait-between-retries)`.
- Keep a bullet point to one or two sentences. Write a longer point as a paragraph or a section.
- Write a proposal in its own `:::decision` block rather than in a bullet point.

### Ask Nick to decide something

Write the question as a heading and put a `:::decision` block with its own id under the heading. Nick then picks the proposal or the alternative with a button, or he writes a reply of his own instead.

```markdown
## Will the export job retry 8 times?

The network of a small shop can be slow in the evening.

:::decision d-1
proposal: Raise the retry limit to 8.
alternative: Keep the retry limit at 5.
pick: proposal, because the network of a shop can be slow.
:::
```

If you reword the question, keep the same id. Give a new decision the next free id.

### Draw something that Markdown can't show

Use an `:::html` block for a diagram or an animation. The block is shown in a sandboxed frame so its styles and scripts can't change the rest of the page. Use the page's design tokens rather than raw colours so that the block looks right in both the light mode and the dark mode.

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

You deal with Nick's comments and his decisions yourself. You hand both kinds of note to a subagent so that they don't fill your context.

### Wait for Nick

Run `wait` in the background and end your turn. Once Nick has been quiet for 10 seconds, `wait` will print the new items and end. In Claude Code, you run a command in the background with the `Bash` tool and `run_in_background`. If you can't run a command in the background, run `inbox` at the start of each turn instead.

```text
$ scratch-pad wait --pad 2026-11-21-invoice-export
2 new items in 2026-11-21-invoice-export

[c-1] comment · pages/index.md:3 · section "How the job runs"
  selected: "every night"
  Nick: Can a shop pick another time?
  block:
    3 | The export job writes the paid invoices of each shop to a CSV file every night.

[d-1] decision · pages/index.md:9 · "Will the export job retry 8 times?"
  Nick chose: proposal

1 grammar note waits for a subagent
```

Each item includes the file and the lines of its block so you can usually edit the page without reading the whole file. When the inbox only prints the first lines of a thread, run `show <id>` to see the whole thread and its block.

Once you've dealt with every item, run `wait` in the background again and end your turn. Otherwise you won't see Nick's next comment until he writes in the chat.

### Reply to a comment

If Nick has asked for a change in his comment, change the page first and then reply in the thread. After your reply the thread waits for Nick, who is the only person that can resolve a thread.

```text
$ scratch-pad reply --pad 2026-11-21-invoice-export c-1 "No. Every shop exports at 02:00, which I've added to the page."
c-1 now waits for Nick
```

### Follow Nick's decision

When Nick has decided, rewrite the text under the question so that it describes his choice. Leave the `:::decision` block where it is, because the block shows his choice on the page. Then close the decision with `done` and one line about the change. Until then, the decision waits for you.

Don't run `reply` or `decide` for a decision, because a decision can't be replied to and the server has already logged Nick's choice. If Nick has written his own reply and it leaves something open, write the open point as a new question with a new `:::decision` block under the question.

```text
$ scratch-pad show --pad 2026-11-21-invoice-export d-1
[d-1] decision · pages/index.md:9 · "Will the export job retry 8 times?" · waits for the agent
  Nick chose: proposal

$ scratch-pad done --pad 2026-11-21-invoice-export d-1 "Raised the retry limit to 8 on the page."
d-1 is done
```

### Hand the notes to a subagent

When `wait` or `inbox` prints a line like `1 grammar note waits for a subagent`, start a subagent and give it the prompt below. Replace `2026-11-21-invoice-export` with your scratch pad's folder. If you can't start a subagent, fix the notes yourself once you've replied to the comments.

```text
Fix the grammar notes and the improvement notes that Nick wrote on the scratch pad 2026-11-21-invoice-export.
Run the tool as: node ${CLAUDE_PLUGIN_ROOT}/scratch-pad/dist/scratch-pad <command>
1. Run: inbox --pad 2026-11-21-invoice-export --type grammar,improvement
2. Change the page file of each note in the way that Nick asks for. Only change the text that the note is about.
3. Close each note with: done --pad 2026-11-21-invoice-export <id> "<one line about what you changed>"
Don't reply to any comment, don't answer any decision and don't stop the server.
```

Here's what the subagent runs and what it sees:

```text
$ scratch-pad inbox --pad 2026-11-21-invoice-export --type grammar,improvement
[g-1] grammar note · pages/index.md:7 · section "Will the export job retry 8 times?"
  selected: "can be slow"
  Nick: Write when it is slow.
  block:
    7 | The network of a small shop can be slow in the evening.

$ scratch-pad done --pad 2026-11-21-invoice-export g-1 "Wrote that the network is slow in the evening."
g-1 is done
```

Nick still sees a closed note on the page, together with the line about the change.

### Log a decision

The server logs every decision that Nick makes on a page, whether he clicks a button or writes his own reply. But the server doesn't log a decision that Nick makes in the chat. Log that decision yourself:

```text
$ scratch-pad decide --pad 2026-11-21-invoice-export "The export job runs at 02:00 for every shop."
decision 2 is logged
```

### Check a page before you tell Nick

Run `check` before you tell Nick that a page is ready. It prints each broken link, each broken `:::decision` block and each id that's used twice.

```text
$ scratch-pad check --pad 2026-11-21-invoice-export
pages/retry-limit.md:3  the link points to pages/queue.md, which doesn't exist
1 problem in 2 pages
```

If the environment variable `SCRATCH_PAD_PROSE_CHECK` is set to a script, `check` will run that script on each page's text as well.

## Share a scratch pad

When Nick wants a file that somebody can read without the server, run `export`. The file shows the same pages as the browser, but a reader can't reply to anything in the file. Everything that the file shows is listed under [The export](reference.md#the-export) in reference.md.

```text
$ scratch-pad export --pad 2026-11-21-invoice-export
exported 3 pages and 4 threads to /Users/nick/scratch-pads/2026-11-21-invoice-export/export.html
```

Pass `--out <file>` to write the file somewhere else.

When you've finished, leave the server running, because another session might still be waiting for Nick on another scratch pad. So don't run `stop` unless you started the server yourself on purpose, for example to test the tool. Even after the server has been stopped, every scratch pad is kept in `~/scratch-pads` so the next session can continue it with `start` and `inbox --all`.
