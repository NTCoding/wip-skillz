# The scratch-pad tool

This folder contains the source of the `scratch-pad` command line tool, which the [scratch-pad skill](../SKILL.md) runs.

- [Setup](../README.md#setup) describes how to build the tool and put it on your PATH.
- [AGENTS.md](AGENTS.md) has the instructions for an agent that changes the browser page.

## How to try a branch

`pnpm try` starts the build of this checkout on port 4800 with a copy of a scratch pad in a temporary folder. Your real scratch pads and the server on port 4747 aren't touched. Build the tool first, then run one of these commands:

```sh
pnpm build
pnpm try                        # the invented "Invoice export" scratch pad
pnpm try <folder>               # a copy of the scratch pad <folder> in ~/scratchpads
pnpm try <folder> --port 4810   # another port
```

The command prints the address of the scratch pad. Ctrl+C stops the server and removes the temporary folder.
