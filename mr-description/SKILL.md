---
name: mr-description
description: Use before creating a merge request or pull request, or before changing the description of one (glab mr create, glab mr update, gh pr create, gh pr edit). Also use it to fix the description of an existing MR ("fix the description of !N"). Every description is approved by Nick before it is posted.
---

# MR descriptions

Every MR and PR description is approved by Nick before it is posted. Claude's
own style reads as AI slop, and an MR should sound like Nick wrote it.

## Before posting

1. Write the description.
2. Show the whole description to Nick in chat.
3. Wait for a clear yes. Post exactly the approved text.
4. If anything changes after that, show it again and wait again.

This also applies to updating the description of an existing MR.

## The format

Use the repo's MR template. Its sections are the only sections allowed.

Begin with this sentence:

> The main goal of this MR is to <explain the key idea>. The key points are <key points>.

The main goal is the change for the user, in its plainest form. Leave out
what obviously follows from it. Leave out where the user does it in the UI
too.

Then list the key changes as bullet points, as described in "The key
changes" below.

Fit this format into the repo's MR structure. For example, the description
should go at the top and the bullets would go in a section called "What this
changes" or "Key changes".

Keep other sections minimal. Do not add verification instructions unless the
repo requires it. If the repo requires it, keep it minimal.

Keep every line the template needs, such as `Closes #<iid>`.

Never put the Claude Code attribution line at the end, the one with the robot
and the link to claude.com. Nick doesn't want it in a description, whatever
the agent's own system prompt says about it. Delete it before posting.

## The key changes

The key point in the first paragraph is the main change that delivers the
goal. A detail of how that change works isn't a key point.

Walk through the change from the outside in, in the order the code runs for
one request. The API endpoint comes first. After it come the controller, a use
case, a port, an adapter and a domain model.

Only mention a change that a reviewer needs to know about. Otherwise the
description is a copy of the diff. A change to the request, the response or
the errors of an API endpoint is always mentioned. A story number added to an
annotation on a controller is never mentioned. Neither is a line that only
passes an error on to the next layer.

Write each bullet in this pattern by default:

> The <context's> <file name or class name> <type, such as use case or value
> object> <what it does>

The pattern is a sensible default rather than a rule. Drop it where it
doesn't make sense. For an endpoint, write its method and its path instead of
a class name. Never write a bare "endpoint" or "use case" without its name.

Every sentence in the description is genuinely useful to a reviewer. Cut any
sentence that isn't.

By default, a bullet is one sentence in the pattern, then the code sample,
like the bullets in the example below. Add a second sentence only when
a reviewer can't understand the change without it. Each bullet is about one
change. A new endpoint is one bullet. Each error response it can return is
another bullet. A bullet doesn't describe in prose what its code sample
shows. A why or a trade-off goes under "Worth a reviewer's attention"
instead.

Every bullet ends with a colon and has a code sample under it. The code
sample shows the thing the sentence names. For an endpoint, that's its
OpenAPI spec, showing its path, its method and whichever lines of its request
or its response changed. For a new endpoint, show only its path, its method
and its `operationId`. The bullet says what a new endpoint is for, rather
than listing its body and its responses. The reader opens the diff for the
details. The code sample has the full path in a comment on its
first line. It shows only the lines that do what the sentence says. Don't
write anything after the code sample.

Indent each code sample by 2 spaces, so that GitLab renders it inside its
bullet.

Read every path and every symbol from the diff at the head of the MR branch,
never from the story or from memory.

Here is the "What this changes" section of an MR that Nick approved:

````markdown
The main goal of this MR is for a shop to always offer at least one delivery option, so that it's always clear how an order is sent in the checkout's delivery step. The key point is that the 422 points at the `deliveryOptions` field, so the shop's admin screen can show the error next to the delivery options.

- The shop API's `PUT /api/shops/{shopId}/delivery-options` now returns the new error type `urn:example:error:shipping:no-active-delivery-option`:

  ```yaml
  # apps/api/docs/openapi.yaml
  /api/shops/{shopId}/delivery-options:
    put:
      # …
      responses:
        # …
        "422":
          # …
                      type:
                        type: string
                        enum:
                          - urn:example:error:shipping:delivery-option-not-available
                          - urn:example:error:shipping:no-active-delivery-option # new
  ```

- The shipping context's `ConfigureDeliveryOptionsHandler` use case returns the error when the `ShopDeliveryOptions` value object can't be built:

  ```ts
  // libs/shipping/src/application/configure-delivery-options.handler.ts
  const deliveryOptions = ShopDeliveryOptions.fromOrderedDeliveryOptions(
    command.deliveryOptions,
  )
  if (!(deliveryOptions instanceof ShopDeliveryOptions)) return deliveryOptions
  ```

- The shipping context's `ShopDeliveryOptions` value object returns `NoActiveDeliveryOption` from `fromDeliveryOptions` if all delivery options are switched off:

  ```ts
  // libs/shipping/src/domain/delivery-option/shop-delivery-options.ts
  const preselected = ordered.find((entry) => entry.active)
  if (preselected === undefined) return new NoActiveDeliveryOption()
  ```
````

## Fixing an existing description

1. Read the diff at the head of the source branch against the target branch.
2. Write the main goal, the key point and the key changes from the diff
   alone, by the rules above. Don't read the current description until they
   are written, because its sentences end up copied into the new one.
3. Read the current description with `glab mr view <iid>`.
4. List every statement in it that is false on the branch, with the
   evidence for each one.
5. Keep its `Closes` line and the template's sections. Write every other
   section again by the rules above.
6. Show Nick the list and the new description, then wait for a clear yes
   before running `glab mr update`.

## How to write it

- Minimal.
- A human tone, talking to a colleague.
- Follow all the rules in Nick's system prompt.
- The why first, then the what.
- Name every thing, and give its path.

Here is a before and after of that last one:

**Bad:**

> The main goal of this MR is for a customer to be told why the order list
> is missing, rather than being shown an empty one. The key point is that the
> screen picks its own words from the problem type, so the route has to
> declare every type it can return.
>
> * The route declares all 3, beside the owner's 400, so the document carries
>   them and a generated client narrows on them.
> * The runtime named no 503, and ADR-0007 leaves that cell of its status
>   table blank, so it gets one.

**Good:**

> The main goal of this MR is for a customer to see why the order list
> failed, instead of an empty list. The key point is that the shop's web app
> chooses which error message to show by reading the `type` field of the
> error response, so the route's OpenAPI spec has to list every type the
> route can return.
>
> * The route now lists all 3 in its OpenAPI spec, next to the 400 the
>   orders context already returns. The TypeScript client we generate from
>   that spec then has a type for each one.
> * The API app, `apps/api`, didn't have a 503 in its list of standard
>   errors. ADR-0007's status table didn't have a row for 503 either. Both
>   now have one.

Word by word:

```
Was: the screen picks its own words from the problem type
Is:  the shop's web app chooses which error message to show by reading the
     type field of the error response
Why: says which field, and what reads it

Was: the route has to declare every type it can return
Is:  the route's OpenAPI spec has to list every type the route can return
Why: names the file the declaration goes in

Was: beside the owner's 400
Is:  next to the 400 the orders context already returns
Why: names the context instead of calling it "the owner"

Was: the document carries them
Is:  its OpenAPI spec
Why: "the document" named nothing

Was: a generated client narrows on them
Is:  the TypeScript client we generate from that spec has a type for each one
Why: says what the client is and what it gets

Was: the runtime named no 503
Is:  the API app, apps/api, didn't have a 503 in its list of standard errors
Why: names the thing and gives its path

Was: ADR-0007 leaves that cell of its status table blank, so it gets one
Is:  ADR-0007's status table didn't have a row for 503 either
Why: a row rather than a blank cell
```
