# wip-skillz

These are some skills I use with AI. I'm constantly tweaking and evolving them, so they are always WIP. They are only intended to be used by me, and the versions here aren't always up to date with my local copies.

I'm sharing them because you might find some useful tips or inspiration.

- `explain-clearly`: Explain a concept in a structured, hierarchical manner so it's easier to understand than the agent's default attempt at explaining.
- `mr-description` is a skill that writes merge request / pull request descriptions the way I would write them.
- `nick-review` is a skill that does a first pass over a merge request and opens an HTML report for me to read before I review it.
- `nick-walkthrough` is a skill that explains a merge request as a short list of points with the code behind each one. It opens an HTML page that I comment on, as a faster alternative to reading the whole diff.
- `rewrite-like-nick` is a skill that rewrites output using my approved grammar rules and verb preferences. I don't use this to rewrite AI content and hand it off to others as my own work, I use it for myself.
- `nick-grammar-rules` is an output style / system that lists the grammar constructions I like and dislike. It also makes the agent end every response with the required inputs from me as a list.
- `scratch-pad` is a skill that moves a long conversation with the agent out of the chat. The agent writes pages that I read and comment on in my browser ([README](scratch-pad/README.md)).
- `hooks` contains the scripts that check text against the grammar rules, which `nick-review` and `nick-grammar-rules` use.

## Install

The repo is a Claude Code plugin, which you can install from GitHub with these 2 commands:

```text
/plugin marketplace add NTCoding/wip-skillz
/plugin install wip-skillz@wip-skillz
```
