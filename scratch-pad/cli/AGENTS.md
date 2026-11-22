# Instructions for an agent that changes the browser page

Read [DESIGN.md](src/browser-page/design-system/DESIGN.md) before you change the browser page, because DESIGN.md is the source of truth for how the page is designed and built. Run `pnpm build` and then `pnpm verify` before you hand the work back.

These are the main sections of DESIGN.md:

- [The rules](src/browser-page/design-system/DESIGN.md#the-rules)
- [The values that need a token](src/browser-page/design-system/DESIGN.md#the-values-that-need-a-token)
- [How the rules are checked](src/browser-page/design-system/DESIGN.md#how-the-rules-are-checked)
- [How to use the design system in a feature](src/browser-page/design-system/DESIGN.md#how-to-use-the-design-system-in-a-feature)
- [How to add a component](src/browser-page/design-system/DESIGN.md#how-to-add-a-component)
- [How to add a token](src/browser-page/design-system/DESIGN.md#how-to-add-a-token)
- [How to add a theme](src/browser-page/design-system/DESIGN.md#how-to-add-a-theme)
- [How the comments are attached to the page](src/browser-page/design-system/DESIGN.md#how-the-comments-are-attached-to-the-page)
- [How the export uses the same page](src/browser-page/design-system/DESIGN.md#how-the-export-uses-the-same-page)

## How to try a branch

Run `pnpm build` and then `pnpm try` to start the build on port 4800 with the invented "Invoice export" scratch pad in a temporary folder. Run `pnpm try <folder>` to use a copy of a scratch pad in ~/scratchpads instead. Add `--port <port>` when port 4800 is in use. Never stop the server on port 4747, because it's Nick's real server. Ctrl+C stops the try server, or you can run the `kill` command that it prints.

Every time you finish a new feature, remind Nick that he can check it with `pnpm try` before he commits. Give him the full command and the folder to run it from, because he'll forget that the command exists.
