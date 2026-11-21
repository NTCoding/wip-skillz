# Reference for the scratch-pad tool

This file describes the details that aren't in [SKILL.md](SKILL.md), such as the options for each command. Read the section that you need rather than the whole file.

## The commands

Every command prints a few short lines. If a command fails, it will print a message to the error stream that describes how to fix the problem. Then it will exit with a code that isn't zero.

| Command                  | What it does                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new <topic>`            | Creates a scratch pad with an index page and a progress tracker                                                                                       |
| `start [--port <port>]`  | Starts the server in the background and prints the address. It never starts a second server, but it restarts a server that's running another version. |
| `stop`                   | Stops the server, which is shared by every scratch pad. It doesn't take `--pad`.                                                                      |
| `serve [--port <port>]`  | Runs the server in the foreground. `start` runs this command in the background.                                                                       |
| `status`                 | Prints the current task and what's waiting for the agent and for Nick. It will also print the scratch pad's address if the server is running.         |
| `inbox [--type <types>]` | Prints the new items that are waiting for the agent. `--all` also prints the items that were printed before.                                          |
| `wait`                   | Prints the new items like `inbox` once Nick has been quiet for 10 seconds                                                                             |
| `show <id>`              | Prints one whole thread or decision                                                                                                                   |
| `reply <id> <text>`      | Adds your reply to a thread, which then waits for Nick                                                                                                |
| `done <id> <outcome>`    | Closes a note or a decision with one line about the change                                                                                            |
| `pages`                  | Lists the pages with their titles and their open threads                                                                                              |
| `outline <page>`         | Prints the headings of a page with their line numbers                                                                                                 |
| `check [page...]`        | Prints the problems in the given pages or in every page, such as a broken link                                                                        |
| `goal <text>`            | Sets the progress tracker's goal                                                                                                                      |
| `tasks`                  | Lists the tasks with their states                                                                                                                     |
| `task add <title>`       | Adds a task to the progress tracker                                                                                                                   |
| `task start <number>`    | Starts a task                                                                                                                                         |
| `task done <number>`     | Finishes a task and starts the next task that's still to do                                                                                           |
| `decide <text>`          | Adds a decision from the chat to the log of decisions                                                                                                 |
| `export [--out <file>]`  | Writes one HTML file that opens without the server. The default file is `export.html` in the scratch pad.                                             |

The types for `--type` are `comment`, `decision`, `grammar` and `improvement`. You can pass several of them with a comma between them. Without `--type`, `inbox` and `wait` print the comments and the decisions in full but only one line for the notes, because the notes are read by a subagent.

A thread waits for you until you reply to it or close it with `done`, whereas a decision waits for you until you close it with `done`. Until then, `--all` prints the item again.

`wait` takes 2 more options:

- `--quiet <seconds>` changes how long Nick has to be quiet, which is 10 seconds by default.
- `--timeout <seconds>` ends the wait after that many seconds, even if there aren't any new items.

Put `--pad` before the text of `new`, `goal`, `task add`, `decide`, `reply` or `done`, because an option after the text is read as part of the text:

```text
$ scratch-pad reply --pad 2026-11-21-invoice-export c-1 "Every shop can pick a time."
c-1 now waits for Nick
link: http://127.0.0.1:4747/2026-11-21-invoice-export/#c-1
```

## The environment variables

| Variable                  | What it changes                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SCRATCH_PADS_HOME`       | The folder that contains every scratch pad. The default folder is `~/scratch-pads`.                         |
| `SCRATCH_PAD`             | The scratch pad that a command works on when `--pad` isn't given                                            |
| `SCRATCH_PAD_PROSE_CHECK` | A script that `check` runs on each page's text. It prints each place where that text breaks a writing rule. |

## What the commands print

### The links

Every command that mentions something Nick can open in the browser prints its address. The address of a decision or a thread ends with its id after a `#`, like `http://127.0.0.1:4747/2026-11-21-invoice-export/#d-1`. This table lists where each command prints the links:

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

An address only works while the server is running. If the server isn't running, the command will print this line instead of the links:

```text
there aren't any links because the server isn't running (scratch-pad start --pad 2026-11-21-invoice-export)
```

### The output of each command

If the server is running, `status` prints the scratch pad's address in the browser on its second line:

```text
$ scratch-pad status --pad 2026-11-21-invoice-export
2026-11-21-invoice-export · /Users/nick/scratch-pads/2026-11-21-invoice-export
in the browser: http://127.0.0.1:4747/2026-11-21-invoice-export/
task 1 of 2: Design the export job
link: http://127.0.0.1:4747/2026-11-21-invoice-export/progress-tracker
waiting for the agent: 1 comment, 1 decision, 1 grammar note
waiting for Nick: nothing
```

`show` prints every message in a thread with the time it was written:

```text
$ scratch-pad show --pad 2026-11-21-invoice-export c-1
[c-1] comment · pages/index.md:3 · section "How the job runs" · waits for the agent
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/#c-1
  selected: "every night"
  block:
    3 | The export job writes the paid invoices of each shop to a CSV file every night.
  Nick (2026-11-21 09:12): Can a shop pick another time?
```

An item whose text was deleted from the page is detached. For a detached item, the tool prints the line that the text was on rather than its block:

```text
[c-2] comment · pages/index.md · detached from line 3
  link: http://127.0.0.1:4747/2026-11-21-invoice-export/#c-2
  selected: "every night"
  Nick: Can a shop pick another time?
  block: (the selected text isn't in pages/index.md any more)
```

`pages` and `outline` help you to read one section rather than a whole page:

```text
$ scratch-pad pages --pad 2026-11-21-invoice-export
pages/index.md  Invoice export  1 open thread  http://127.0.0.1:4747/2026-11-21-invoice-export/

$ scratch-pad outline --pad 2026-11-21-invoice-export index.md
1  # Invoice export  http://127.0.0.1:4747/2026-11-21-invoice-export/#invoice-export
2  ## How the job runs  http://127.0.0.1:4747/2026-11-21-invoice-export/#how-the-job-runs
5  ## Will the export job retry 8 times?  http://127.0.0.1:4747/2026-11-21-invoice-export/#will-the-export-job-retry-8-times
```

`check` prints one line for each problem:

```text
$ scratch-pad check --pad 2026-11-21-invoice-export
pages/bad.md:3  the link points to pages/nowhere.md, which doesn't exist
pages/bad.md:5  decision d-1 doesn't have the alternative: line
pages/bad.md:5  decision d-1 is used twice (first on pages/index.md:9)
3 problems in 2 pages
```

## The folder of a scratch pad

Every scratch pad is a folder in `~/scratch-pads`. The name of the folder is `<yyyy-mm-dd>-<topic>`:

```text
~/scratch-pads/2026-11-21-invoice-export/
  pages/index.md               # the first page
  pages/retry-limit.md         # one Markdown file for each page
  custom/export-steps.html     # an optional file for a long :::html block
  pad.db                       # the threads, the tasks and the log of decisions
  export.html                  # written by the export command
```

You only write the files in `pages` and in `custom`. Never edit `pad.db` yourself, because it's written by the tool and the server.

## The named blocks

A named block starts with a line like `:::decision d-1` and ends with a `:::` line.

### The decision block

A decision block needs an id like `d-1` and the 3 lines below. Each of the 3 entries can run over several lines of the file and can contain inline Markdown.

```markdown
:::decision d-2
proposal: Write one CSV file per shop.
alternative: Write one CSV file for every shop together.
pick: proposal, because a shop only downloads its own file.
:::
```

The heading above the block is the question. If there isn't a heading above the block, Nick won't be able to choose an option for the decision.

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

## The export

The export is one HTML file that a reader can open from the disk without the server. `export` writes the browser page's bundle, the design system's CSS and the scratch pad's data into that file.

The file shows:

- every page in the Medium theme, together with the sidebar and the table of contents
- the progress tracker and the log of decisions
- each thread beside its block

A reader can follow every link between the pages.

The file doesn't have any reply boxes or decision buttons, because a reader can't change anything in the file. The Inbox isn't shown either.

In the export, a link to another page of the scratch pad doesn't work inside an `:::html` block, but a link to another site still works.

The export doesn't contain any images. But an image with a full URL will still be loaded from that URL when the reader opens the file.
