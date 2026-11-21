# scratch-pad

With this skill, I work with the agent on pages in my browser rather than in the chat. The agent writes the pages in Markdown. I read them in the browser, where I comment on the text and make the decisions that the agent asks me for.

![A page with a comment and the agent's reply](docs/page-with-comment-thread.png)

![The Inbox lists what's waiting for me](docs/inbox.png)

![A decision that's waiting for me](docs/decision.png)

## Setup

The skill runs a command line tool called `scratch-pad`, which is built from the source in [cli](cli). The tool needs these 3 things on your machine:

- Node 24
- pnpm 11
- pnpm's global folder on your PATH, which `pnpm setup` adds to your shell profile. Open a new terminal after `pnpm setup`.

Here is the setup command for a new machine:

```bash
git clone https://github.com/NTCoding/wip-skillz.git && cd wip-skillz/scratch-pad/cli && pnpm install && pnpm build && pnpm add --global .
```

Here is the update command, which you run in `scratch-pad/cli`:

```bash
git pull && pnpm install && pnpm build
```

`pnpm add --global .` links the folder so an update doesn't need another install. The link points at the folder of your clone, which means a moved clone needs `pnpm add --global .` again.
