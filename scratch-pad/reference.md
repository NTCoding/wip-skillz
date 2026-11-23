# Reference for the scratch-pad tool

This file describes the details that aren't in [SKILL.md](SKILL.md), such as the options for each command. Read the section that you need rather than the whole file.

## The commands

Every command prints a few short lines. If a command fails, it will exit with a code that isn't zero. Before it exits, it will print a message to the error stream so that you know how to fix the problem.

| Command                             | What it does                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new <topic>`                       | Creates a scratch pad with an index page and a progress tracker                                                                                       |
| `start [--port <port>]`             | Starts the server in the background and prints the address. It never starts a second server, but it restarts a server that's running another version. |
| `stop`                              | Stops the server, which is shared by every scratch pad. It doesn't take `--pad`.                                                                      |
| `serve [--port <port>]`             | Runs the server in the foreground. `start` runs this command in the background.                                                                       |
| `status`                            | Prints the current task and what's waiting for the agent and for Nick. It will also print the scratch pad's address if the server is running.         |
| `inbox [--type <types>]`            | Prints the new items that are waiting for the agent. `--all` also prints the items that were printed before.                                          |
| `wait`                              | Waits until Nick has been quiet for 10 seconds and then prints the new items in the same way as `inbox`                                               |
| `show <id>`                         | Prints one whole thread or decision                                                                                                                   |
| `reply <id> <text>`                 | Adds your reply to a thread, which then waits for Nick                                                                                                |
| `done <id> <outcome>`               | Closes a note or a decision with one line about what you changed                                                                                      |
| `pages`                             | Lists the pages with their titles and their open threads, in the order of their numbers                                                               |
| `outline <page>`                    | Prints the headings of a page with their line numbers                                                                                                 |
| `check [page...]`                   | Prints each problem in the given pages or in every page. A broken link is one example of a problem.                                                   |
| `goal <text>`                       | Sets the progress tracker's goal                                                                                                                      |
| `tasks`                             | Lists the tasks with their states                                                                                                                     |
| `task add <title>`                  | Adds a task to the progress tracker                                                                                                                   |
| `task start <number>`               | Starts a task                                                                                                                                         |
| `task done <number>`                | Finishes a task and starts the next task that's still to do                                                                                           |
| `decide <text>`                     | Adds a decision from the chat to the log of decisions                                                                                                 |
| `improve <title>`                   | Logs an improvement to the harness, the skill, the tool or the UX. It reads the Markdown details from standard input.                                 |
| `improvement edit <number> <title>` | Replaces the title and the details of an improvement. It reads the new Markdown details from standard input.                                          |
| `improvement delete <number>`       | Deletes an improvement                                                                                                                                |
| `export [--out <file>]`             | Writes one HTML file that a reader can open without the server. The default file is `export.html` in the scratch pad.                                 |

You can pass a page to a command with or without its number. So `1.1-retry-limit.md`, `retry-limit.md` and `retry-limit` are the same page for every command. But the tool's own output always shows the full file name, like `pages/1.1-retry-limit.md:3` for line 3 of that page.

The types for `--type` are `comment`, `decision`, `grammar` and `improvement`. You can pass several of them with a comma between them. Without `--type`, `inbox` and `wait` print the comments and the decisions in full but only one line for the grammar notes and the improvement notes, because those notes are read by a subagent.

`--all` prints an item again for as long as the item waits for you. A thread waits for you until you reply to it or close it with `done`, whereas a decision waits for you until you close it with `done`.

`wait` takes 2 more options:

- `--quiet <seconds>` changes how long Nick has to be quiet, which is 10 seconds by default.
- `--timeout <seconds>` ends the wait after that many seconds, even if there aren't any new items.

Put `--pad` before the text of `new`, `goal`, `task add`, `decide`, `improve`, `improvement edit`, `reply` or `done`, because an option after the text is read as part of the text:

```text
$ scratch-pad reply --pad 2026-11-21-invoice-export c-1 "Every shop can pick a time."
c-1 now waits for Nick
link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#c-1
Run `wait` in the background before you end your turn.
```

## The environment variables

| Variable                  | What it changes                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SCRATCH_PADS_HOME`       | The folder that contains every scratch pad. The default folder is `~/scratchpads`.                          |
| `SCRATCH_PAD`             | The scratch pad that a command works on when `--pad` isn't given                                            |
| `SCRATCH_PAD_PROSE_CHECK` | A script that `check` runs on each page's text. It prints each place where that text breaks a writing rule. |

## What the commands print

### The links

When a command's output includes something that Nick can open in the browser, the command will also print the address of that thing. The address of a decision or a thread ends with its id after a `#`, like `http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#d-1`. This table lists where each command prints the links:

| Command                                                | Where the link is                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `status`                                               | The scratch pad's address on the second line and a `link:` line to the progress tracker under the current task |
| `inbox`, `wait` and `show`                             | A `link:` line under the first line of an item                                                                 |
| `reply` and `done`                                     | A `link:` line to the thread or the decision                                                                   |
| `pages`                                                | The address of each page at the end of its line                                                                |
| `outline`                                              | The address of each heading at the end of its line                                                             |
| `new`                                                  | A `link:` line to the scratch pad                                                                              |
| `goal`, `tasks`, `task add`, `task start`, `task done` | A `link:` line to the progress tracker                                                                         |
| `decide`                                               | A `link:` line to the log of decisions                                                                         |
| `improve` and `improvement edit`                       | A `link:` line to the improvement on the Improvements tab                                                      |
| `improvement delete`                                   | A `link:` line to the Improvements tab                                                                         |

An address only works while the server is running. If the server isn't running, the command will print this line instead of the links:

```text
there aren't any links because the server isn't running (scratch-pad start --pad 2026-11-21-invoice-export)
```

### The output of each command

If the server is running, `status` prints the scratch pad's address in the browser on its second line:

```text
$ scratch-pad status --pad 2026-11-21-invoice-export
2026-11-21-invoice-export · /Users/nick/scratchpads/2026-11-21-invoice-export
in the browser: http://127.0.0.1:4747/2026-11-21-invoice-export/
task 1 of 2: Design the export job
link: http://127.0.0.1:4747/2026-11-21-invoice-export/progress-tracker
waiting for the agent: 1 comment, 1 decision, 1 grammar note
waiting for Nick: nothing
```

`show` prints every message in a thread with the time it was written:

```text
$ scratch-pad show --pad 2026-11-21-invoice-export c-1
[c-1] comment · pages/1-how-the-job-runs.md:3 · section "How the job runs" · waits for the agent
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#c-1
  selected: "every night"
  block:
    3 | The export job writes the paid invoices of each shop to a CSV file every night.
  Nick (2026-11-21 09:12): Can a shop pick another time?
Run `wait` in the background before you end your turn.
```

If the text that an item is attached to is deleted from the page, the item will be detached. For a detached item, the tool prints the line that the text was on rather than its block:

```text
[c-2] comment · pages/1-how-the-job-runs.md · detached from line 3
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#c-2
  selected: "every night"
  Nick: Can a shop pick another time?
  block: (the selected text isn't in pages/1-how-the-job-runs.md any more)
```

`pages` and `outline` help you to read one section rather than a whole page. In the output of `pages`, the first column is the number of each page. Here is what both commands print:

```text
$ scratch-pad pages --pad 2026-11-21-invoice-export
       pages/index.md                       Invoice export        no open threads  http://127.0.0.1:4747/2026-11-21-invoice-export/
1      pages/1-how-the-job-runs.md          How the job runs      1 open thread    http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md
1.1    pages/1.1-retry-limit.md             Retry limit           no open threads  http://127.0.0.1:4747/2026-11-21-invoice-export/retry-limit.md
1.1.1  pages/1.1.1-wait-between-retries.md  Wait between retries  no open threads  http://127.0.0.1:4747/2026-11-21-invoice-export/wait-between-retries.md

$ scratch-pad outline --pad 2026-11-21-invoice-export how-the-job-runs.md
1  # How the job runs  http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#how-the-job-runs
5  ## Will the export job retry 8 times?  http://127.0.0.1:4747/2026-11-21-invoice-export/how-the-job-runs.md#will-the-export-job-retry-8-times
```

`check` prints one line for each problem:

```text
$ scratch-pad check --pad 2026-11-21-invoice-export
pages/2.1-queue.md  the page is a sub page of page 2, which doesn't exist. Add a page 2-<name>.md or change the number of this page
pages/3-bad.md:3  the link points to pages/nowhere.md, which doesn't exist
pages/3-bad.md:5  decision d-1 doesn't have the alternative: line
pages/3-bad.md:5  decision d-1 is used twice (first on pages/1-how-the-job-runs.md:9)
pages/3-bad.md:7  the link includes the number 1.1 of the page. Write the link as retry-limit.md so that it still works after the page is renumbered
pages/3-bad.md:11  decision d-4 doesn't have a context (write one on the context: line)
6 problems in 4 pages
```

## The folder of a scratch pad

Every scratch pad is a folder in `~/scratchpads`. The name of the folder is `<yyyy-mm-dd>-<topic>`:

```text
~/scratchpads/2026-11-21-invoice-export/
  pages/index.md               # the first page
  pages/1-how-the-job-runs.md  # one Markdown file for each page
  pages/1.1-retry-limit.md     # a sub page of page 1
  custom/export-steps.html     # an optional file for a long :::html block
  pad.db                       # the threads, the tasks, the log of decisions and the improvements
  export.html                  # written by the export command
```

You only write the files in `pages` and in `custom`. Never edit `pad.db` yourself, because it's written by the tool and the server.

## The numbers of the pages

The tool reads the order of the pages and the parent of each sub page from the numbers at the start of the file names. [Number the pages](SKILL.md#number-the-pages) in SKILL.md describes how you number the pages.

Every list of pages follows the numbers. The tool compares 2 numbers part by part, which means that page 1.10 comes after page 1.2 and page 2 comes after page 1.9. The index page is always first. A page without a number comes after the numbered pages, in the order of the file names.

The id of a page is its file name without the number. The address of the page in the browser is built from that id. The threads and the decisions on the page are stored under that id too. That's why a new number doesn't change the address or the threads of a page.

A page without a number has its whole file name as its id. The tool reads the digits before the first dash as a number so a file called `2026-plan.md` is page 2026 with the id `pages/plan.md`. If `pad.db` has a thread or a decision under the full file name of a page, the tool will move that thread or decision to the id of the page.

`check` prints a problem for each of these:

- a page other than `index.md` that doesn't have a number
- 2 files that have the same name after their numbers
- a number with a leading zero, like `01-how-the-job-runs.md`
- 2 files that have the same number
- a sub page whose parent number doesn't exist, like `2.1-queue.md` without any `2-….md`
- a link between pages that includes the number, like `[the retry limit](1.1-retry-limit.md)`

## The named blocks

A named block starts with a line like `:::decision d-1` and ends with a `:::` line.

### The decision block

A decision block needs an id like `d-1` and the 3 entries `proposal:`, `alternative:` and `pick:`. Each of those entries can run over several lines of the file and can contain inline Markdown. A `context:` entry before them is optional. The context can run over several lines too. It can contain a paragraph and a numbered list of links to the sections that Nick should read before he decides.

<!-- prettier-ignore -->
```markdown
:::decision d-2
context: A shop only downloads the invoices of its own customers. Read these in order:
  1. [The export file](export-file.md) lists the columns of the file.
proposal: Write one CSV file per shop.
alternative: Write one CSV file for every shop together.
pick: proposal, because a shop only downloads its own file.
:::
```

The heading above the block is the question. If there isn't a heading above the block, Nick won't be able to choose an option for the decision.

If the `context:` line of an open decision is missing or empty, `check` will print a problem. It won't print a problem for a decision once Nick has decided.

### The html block

An `:::html` block can contain any HTML, including its own styles and scripts. The page shows the block in a sandboxed frame so that the block can't read the page or send anything on Nick's behalf. If the block links to another site, the link will open in a new tab.

Use these tokens rather than raw values so that the block looks like the rest of the page:

| Group    | Tokens                                                                                 |
| -------- | -------------------------------------------------------------------------------------- |
| Text     | `--text`, `--text-2`, `--text-label`                                                   |
| Surfaces | `--surface-reading`, `--surface-raised`, `--surface-soft`, `--surface-muted`, `--tint` |
| Accents  | `--accent`, `--accent-strong`, `--accent-pale`, `--warning-bg`, `--warning-ink`        |
| States   | `--state-done`, `--state-doing`, `--state-todo`                                        |
| Lines    | `--line`, `--line-soft`, `--line-strong`                                               |
| Fonts    | `--font-body`, `--font-ui`, `--font-mono`, `--fs-ui`, `--fs-sm`, `--fs-md`, `--lh-ui`  |
| Spacing  | `--space-xs` to `--space-9xl`                                                          |
| Corners  | `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-pill`                                     |

The frame sets the text's font and colour from the same tokens.

### The agent-note block

An `:::agent-note` block contains a point that Nick needs to be aware of before he trusts the rest of the page. The block can contain any Markdown, including several paragraphs. The page shows the block under an "Agent note" label so that Nick can tell the agent's note apart from the page's own messages.

```markdown
:::agent-note
I haven't read the full code. I've only looked at the commit history.
:::
```

## The export

The export is one HTML file that a reader can open from the disk without the server. `export` writes the browser page's bundle, the design system's CSS and the scratch pad's data into that file.

The file shows:

- every page in the Medium theme, together with the sidebar and the table of contents
- the progress tracker, the log of decisions and the improvements
- each thread beside its block

A reader can follow every link between the pages. But inside an `:::html` block, a link to another page of the scratch pad doesn't work, whereas a link to another site still works.

The file doesn't have any reply boxes or decision buttons, because a reader can't change anything in the file. The Inbox isn't shown either.

The export doesn't contain any images. But an image with a full URL will still be loaded from that URL when the reader opens the file.
