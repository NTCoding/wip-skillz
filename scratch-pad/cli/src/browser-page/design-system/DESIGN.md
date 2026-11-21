# The design system of the browser page

The browser page is the React page in `src/browser-page` that shows a scratch pad in the Medium theme. We want every part of the page to look consistent, including every part that's added later. So every part of the page is built from the components in this folder rather than styled on its own.

This file describes the folders and the rules of the design system first. Some of the sections after the rules explain how a part of the page works, like the layout in a narrow window or the frame of an html block. The other sections describe how to change the page, like adding a component or a token.

## The folders

| Folder or file           | What it contains                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `tokens/tokens.css`      | The tokens as custom properties, which are listed by group in that file                         |
| `page-base.css`          | The styles of `body`, the selection and the focus ring                                          |
| `components/<name>/`     | One component in 4 files, which are listed in [How to add a component](#how-to-add-a-component) |
| `gallery/`               | The frame that shows each story in the gallery                                                  |
| `design-system.ts`       | The only module that a feature imports                                                          |
| `design-system.spec.tsx` | Checks each component folder and renders every story                                            |

## The rules

1. Every value in a CSS file is a token, like `var(--space-md)` or `var(--text)`. Outside `tokens/`, the lint rejects a literal value of every kind that's listed in the table below.
2. A colour in a TypeScript string is a lint error too. An inline SVG uses `currentcolor` instead.
3. A theme only overrides tokens. It never adds a rule for a component.
4. A component only imports its own CSS. It uses another component through that component's React function.
5. A feature only imports components from `design-system.ts` so it never imports a CSS file. It doesn't pass `className` or `style` to an element either.
6. A component never sets its own outer margin, because the reading column sets the space between a page's blocks.
7. Each component folder contains the 4 files that are listed in [How to add a component](#how-to-add-a-component).
8. `design-system.ts` exports each component under the name in its stories' title.
9. Every story and every test uses invented text, like an export job or an invoice template.

## The values that need a token

The Stylelint rule `tokens/value-from-token` checks each declaration outside `tokens/`. This table lists what the rule rejects and what it accepts without a token:

| Kind    | Properties                                           | Rejected                         | Accepted                       |
| ------- | ---------------------------------------------------- | -------------------------------- | ------------------------------ |
| Colour  | every property                                       | `#242424`, `rgb(0 0 0 / 5%)`     | `currentcolor`, `transparent`  |
| Font    | the font properties, `font` and `line-height`        | `14px`, `700`, `bold`, `Georgia` | `inherit`, `normal`            |
| Spacing | `margin`, `padding`, `gap`                           | `13px`, `5%`, `20vh`             | `0`, `auto`                    |
| Spacing | `top`, `inset` and the other offsets                 | `12px`                           | `0`, `100%`                    |
| Size    | `width`, `height`, `flex-basis`, the grid            | `683px`, `20rem`                 | `100%`, `100vh`, `auto`, `1fr` |
| Radius  | `border-radius`                                      | `7px`, `50%`                     | `0`                            |
| Shadow  | `box-shadow`, `text-shadow`                          | `0 2px 9px var(--tint)`          | `none`                         |
| Border  | `border`, `outline`, `outline-offset`, the underline | `1px solid var(--line)`, `4px`   | `0`, `none`                    |
| Any     | a custom property like `--gutter`                    | `4px`                            | `calc(var(--space-md) * 2)`    |

The rule recognises every colour format that's defined in CSS Color 4 and 5. The rule also checks the fallback in `var()`, which is why `var(--gap, 12px)` is rejected.

## How the rules are checked

`pnpm verify` runs every check in this table. It also builds the gallery of the components with Storybook through `pnpm gallery:build`. The second column describes what makes each check fail:

| Check                                                                       | What fails the check                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The Stylelint rule `tokens/value-from-token`, on every CSS file in `src`    | A value like `padding: 13px`, `width: 683px` or `color: #242424`. Use a token instead. If there isn't a token that fits, add a token to `tokens/tokens.css` as described in [How to add a token](#how-to-add-a-token). The values that are accepted without a token are listed in [The values that need a token](#the-values-that-need-a-token). |
| The ESLint rule `tokens/no-colour-in-string`, on the browser page's strings | A colour in a TypeScript string                                                                                                                                                                                                                                                                                                                  |
| `tokens/token-contrast.spec.ts`                                             | A text colour that has too little contrast on its background. `token-contrast.spec.ts` checks each pair of a text token and a background token. Text needs 4.5 to 1, whereas a focus ring and an icon need 3 to 1.                                                                                                                               |
| `no-restricted-imports`                                                     | A feature that imports `design-system/components/...` or a CSS file                                                                                                                                                                                                                                                                              |
| `react/forbid-dom-props`                                                    | `className` or `style` on an element in a feature                                                                                                                                                                                                                                                                                                |
| `design-system.spec.tsx`                                                    | A component folder that doesn't have one of its 4 files, like its story, its `<name>.css` or its `<name>.spec.tsx`. A component that `design-system.ts` doesn't export fails `design-system.spec.tsx` too.                                                                                                                                       |

`no-restricted-imports` and `react/forbid-dom-props` make sure that a feature only uses the public components.

The custom lint rules `tokens/value-from-token` and `tokens/no-colour-in-string` are in `.token-lint/` at the root of the project. The rules in that folder need 100% test coverage, like the code in `src`.

Run `pnpm build` after every change to `src`, because the skill runs the built tool in `dist/scratch-pad`. The last step of `pnpm verify` will fail if `dist/scratch-pad` isn't the bundle of the current source.

## The layout in a narrow window

In a window that's narrower than 900px, an open sidebar would squeeze the text too much. So these 2 things change below 900px:

- In a narrow window, the sidebar has a separate state that is never saved so the choice that Nick saved in a wide window doesn't change. The sidebar will be collapsed whenever the page opens and after every navigation. It will be collapsed every time the window crosses 900px too. The code for this state is in `sidebar-state.ts`.
- An open sidebar is shown on top of the page rather than beside the page. The page behind the sidebar is faded. If Nick clicks the faded page, the sidebar will collapse.

`narrowAppFrameQuery` in `app-frame.tsx` is `(width < 900px)`. The same width is written out in `app-frame.css`, because a media query can't read a custom property. `app-frame.spec.tsx` will fail if the 2 widths differ.

The reading column is the area beside the sidebar. Its layout depends on its own width rather than on the width of the window:

- Below 1040px, the text is centred and the margin with the comments is hidden. Each thread is shown as a marker beside the text instead. If Nick clicks a marker, the card of the thread will open below the text that the thread is about.
- From 1040px, the margin is shown beside the text and the markers are hidden. The margin is `--lane-w-narrow` wide below 1152px and `--lane-w` wide from 1152px.

The widths are written out in `reading-column.css` and `margin-lane.css`, because a container query can't read a custom property. `reading-column.spec.tsx` will fail if the widths in the 2 files differ.

## Positions that are measured at runtime

The position of the selection tools and of the cards in the margin is only known in the browser, because they're placed beside text. Only a design system component is allowed to place an element like that. The design system component measures the page in a layout effect and then sets the position as a custom property through a ref.

A component uses a ref for this rather than a `style` prop, because the ESLint rule `react/forbid-dom-props` bans `style` in every file of the browser page apart from the tests. That ban includes the components of the design system as well as the features.

```tsx
// src/browser-page/design-system/components/selection-tools/selection-tools.tsx
element?.style.setProperty(
  '--selection-tools-top',
  `${Math.round(top - element.offsetHeight - 8)}px`,
)
```

```css
/* src/browser-page/design-system/components/selection-tools/selection-tools.css */
.selection-tools {
  position: absolute;
  top: var(--selection-tools-top, 0);
}
```

Each card in the margin is placed beside its anchor. The anchor is the thread's `Highlight`, which has the thread id in `data-highlight`. If a thread's text doesn't have a highlight, the card will be anchored to the block whose `data-lines` is the same as the card's `anchorLines`. `MarginLane` looks for both kinds of anchor inside the closest element with `data-margin-scope`, which `ReadingColumn` sets when the column has a margin.

A component that measures the page can't be tested in a real layout, because the browser page's tests run in jsdom. jsdom doesn't have `ResizeObserver`, `Range.getBoundingClientRect`, `showPopover` or `HTMLDialogElement.showModal`. `browser-page-test-setup.ts` stubs all 4 of them so a component can use them without checking for jsdom.

## The frame of an html block

`HtmlBlock` shows the HTML of an `:::html` block in an iframe. The agent writes that HTML so the page has to treat the HTML as untrusted. That's why the frame is sandboxed with `allow-scripts` but without `allow-same-origin`. The frame that the server sends is sandboxed by the `sandbox` directive in the Content-Security-Policy header of the frame document, because the Claude desktop app blocks every iframe that has a `sandbox` attribute. An export doesn't have a server so the frame in an export is sandboxed by `sandbox="allow-scripts"` on the iframe. The scripts and the styles of the block still work inside the frame, but they can't read or change anything outside the frame or call the API.

The page and the frame talk to each other in these steps:

1. The server returns a small frame document at `/browser-page/html-block-frame.html`. The frame document has its own content security policy, because the browser page's policy doesn't allow the block's inline scripts. The frame's policy allows inline scripts and inline styles, but it only allows a connection to an `https:` address. It doesn't allow a form to be sent either.
2. The frame sends a ready message and a `MessagePort` to the page.
3. `connectHtmlBlockFrame` sends the block's HTML through the `MessagePort`. The HTML is wrapped in a document with a `:root` rule, which contains the page's tokens.
4. The frame sends its content's height through the `MessagePort` and `HtmlBlock` sets that height as `--html-block-height`.
5. If Nick clicks a link in the frame, the frame will send the link's address through the `MessagePort` rather than open the link itself. If the address is a page of the scratch pad, `followLink` will open that page in the browser page. It opens an `http:`, `https:` or `mailto:` address in a new tab and ignores every other address.

`HtmlBlock` has a comment button beside the full size control, because the page can't see a selection inside the frame. Nick uses that button to comment on the block as a whole.

The full size view shows the same frame in the top layer rather than rendering the block a second time.

## How to use the design system in a feature

Import the components from `design-system/design-system` and compose them, because [the rules](#the-rules) don't allow a feature to style anything itself. Plain elements like `<h1>` and `<p>` are fine inside `ReadingColumn` because `ReadingColumn` sets their fonts and spacing.

```tsx
// src/browser-page/pad-views.tsx
import { Notice, ReadingColumn, TaskList } from './design-system/design-system'

export function ProgressTrackerView({ tracker }: { readonly tracker: ProgressTracker }) {
  return (
    <ReadingColumn>
      <h1>Progress tracker</h1>
      {tracker.tasks.length === 0 ? (
        <Notice tone="info">There aren’t any tasks yet.</Notice>
      ) : (
        <TaskList tasks={tracker.tasks} />
      )}
    </ReadingColumn>
  )
}
```

If there isn't a component that fits, add a component to the design system rather than styling the feature.

## How to add a component

A component is one folder in `src/browser-page/design-system/components`. The folder's name is in kebab case, like `thread-card`. Write these 4 files in the folder:

1. `thread-card.tsx`, which only imports its own CSS file.
2. `thread-card.css`, which only uses tokens.
3. `thread-card.stories.tsx`, whose title is `Design system/ThreadCard`. Every story title has the form `Design system/<ComponentName>`.
4. `thread-card.spec.tsx`, which tests what Nick sees and what happens when he clicks.

Then export `ThreadCard` from `src/browser-page/design-system/design-system.ts`.

```tsx
// src/browser-page/design-system/components/thread-card/thread-card.tsx
import { type ReactNode } from 'react'
import './thread-card.css'

interface ThreadCardProps {
  readonly author: string
  readonly children: ReactNode
}

export function ThreadCard({ author, children }: ThreadCardProps) {
  return (
    <article className="thread-card">
      <p className="thread-card__author">{author}</p>
      {children}
    </article>
  )
}
```

```css
/* src/browser-page/design-system/components/thread-card/thread-card.css */
.thread-card {
  padding: var(--space-3xl) var(--space-4xl);
  border-radius: var(--r-md);
  background: var(--surface-raised);
  box-shadow: var(--shadow-sm);
}

.thread-card__author {
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: var(--lh-sm);
}
```

```tsx
// src/browser-page/design-system/components/thread-card/thread-card.stories.tsx
import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ThreadCard } from './thread-card'

const meta = {
  title: 'Design system/ThreadCard',
  component: ThreadCard,
  args: { author: 'Nick', children: 'Is 5 retries enough for the export job?' },
} satisfies Meta<typeof ThreadCard>

export default meta

export const OneMessage: StoryObj<typeof meta> = {}
```

Run `pnpm gallery` to look at your new component on port 6106, where the gallery shows every story.

## How to add a token

Add the token to `tokens/tokens.css` in the group it belongs to.

```css
/* src/browser-page/design-system/tokens/tokens.css */
--thread-highlight: #e0f0e0;
```

## How to add a theme

A theme overrides the tokens under its own attribute. The Medium theme's values are the defaults in `tokens/tokens.css`. Here is an example theme called `editorial`:

```css
/* src/browser-page/design-system/tokens/editorial.css */
[data-theme='editorial'] {
  --font-body: Georgia, serif;
  --fs-body: 19px;
  --col-w: 640px;
}
```

Import the theme's CSS file in `design-system.ts` and then set `data-theme` on `<html>` in `src/local-server/browser-page.ts`.

## How the comments are attached to the page

The comments feature is made of these files:

| File                    | What it does                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `selected-block.ts`     | Turns Nick's selection into the selected text and the lines of its block. It also adds the text before and after the selection.                                                      |
| `visible-text.ts`       | Builds a block's text in the same way as the server does. It puts a space between table cells and between list items. It leaves out a code block's bar and the text of every button. |
| `thread-anchors.ts`     | Shows each card beside the block where the server found the thread's text. If the thread is detached, the card will be shown near the thread's old lines.                            |
| `text-highlights.tsx`   | Finds the selected text in a block and splits the text nodes into `Highlight` components                                                                                             |
| `page-with-threads.tsx` | Shows the page with its cards in the margin. It also shows the draft of a new thread and the selection tools.                                                                        |
| `missing-page-view.tsx` | Shows the threads that are waiting for Nick on a page that the agent has deleted. Nick can still reply to those threads or resolve them there.                                       |

The server builds a block's text from the Markdown in the same way as `visible-text.ts` does in the browser. The server's code for this is in `src/rendered-page/page-blocks.ts`. `visible-text.ts` and `page-blocks.ts` are both tested against `visible-text-fixtures.ts`. If you change how one of them builds the text, a test will fail until the other one builds the same text again.

Nick comments on an `:::html` block with its comment button. The draft of that comment has an empty `selectedText` so the server stores the whole block's text as the selected text.

A change to how the server finds a thread's text again belongs in `src/threads/thread-position.ts` rather than in the browser page. The server works out where each thread's text is now and returns that as the `position` of every thread from the API. `thread-anchors.ts` only turns that position into a block on the page.

## How the export uses the same page

`scratch-pad export` writes one HTML file, which contains the same bundle that the server sends to the browser. It also contains the scratch pad's data in a `<script id="scratch-pad-export">` element. If that element is there, `start-browser-page.tsx` reads the element and starts the page in its read-only mode. The export differs from the page from the server in these 4 ways:

| The page from the server                         | The export                                      |
| ------------------------------------------------ | ----------------------------------------------- |
| `scratchPadConnection` sends requests to the API | `exportedScratchPad` reads the data in the file |
| `servedAddresses`, like `/<pad>/retry-limit.md`  | `exportedAddresses`, like `#/retry-limit.md`    |
| `writing` is the connection                      | `writing` is `undefined`                        |
| The frame of an `:::html` block has a `src`      | The frame of an `:::html` block has a `srcdoc`  |

If you add a control that changes something, like a reply box or a decision button, only show the control when `writing` isn't `undefined`, because that's how the read-only mode hides the existing controls. `exported-scratch-pad.spec.tsx` tests the page in its read-only mode.
