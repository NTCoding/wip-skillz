# Passages Nick wrote

Longer passages from Nick's blog. Read the one for
the kind of passage you are about to write, then write yours as a
continuation of it. Each is verbatim.

## The opening of a document. The key idea, then the reason, hedged

> A well-crafted system prompt will increase the quality of code produced by
> your coding assistant. It does make a difference. If you provide guidelines
> in your system prompt for writing code and tests, coding assistants will
> follow the guidelines.
>
> Although that depends on your definition of "will follow". If your
> definition is "will follow often" then it's accurate. If your definition is
> "will follow always" or even "will follow most of the time" then it's
> inaccurate (unless you've found a way to make them reliable that I haven't,
> please let me know).
>
> Coding agents will ignore instructions in the system prompt on a regular
> basis. As the context window fills up and starts to intoxicate them, all
> bets are off.
>
> Even with the latest Opus 4.5 model, I haven't noticed a major improvement.
> So if we can't rely on models to follow system prompts, we need to invest
> in feedback cycles.

## Why a rule exists

> Location-based rules are the main reason I went down this direction because
> AI agents weren't following written instructions well enough, regardless of
> how precise I tried to make them.
>
> But they weren't the only problems. I found AI (Claude Code) to be quite
> poor at reasoning about coupling in a system. It created dependencies that
> were unnecessary. So in the DSL configuration, I added coupling-based rules
> as well.
>
> Here, you can see that no components in the /commands location can import
> CLI-related code. That is just a wrong dependency. CLI-related code is the
> entrypoint of a system, it's an adapter from external formats to internal
> formats. A command use case should be decoupled from that, you shouldn't be
> parsing raw input data in a command-use-case. forbiddenImports prevents
> that.

## A rule and the trade off behind it

> I want all value objects to be consistent and follow certain rules. Even if
> that means some code is not as elegant as I would like, consistency makes
> things easier to navigate and, more importantly, enforce. So I optimise for
> that.

> Package, domain, and layer-based rules are pretty easy to set up and
> enforce. I find it hard to justify not adding those. If you can't set
> codebase standards at that level, I don't think you'll get far with agentic
> AI.
>
> Adding role annotations to all your code, classifying every piece of code,
> and defining rules at the role-level? Yeah, still playing around with that.
> Come back in 6 months. I feel confident it's the right approach.

## How a mechanism works

> The workflow engine encapsulates the state persistence. It prevents
> transitioning from one state to another if all requirements are not met.
> For example, you cannot transition from planning to reviewing. You have to
> go via developing to implement something first.
>
> Equally, the workflow engine will block operations in each state. For
> example, when in the developing state, git commit is banned. git commit is
> only allowed in the committing phase which can only be transitioned to
> after the reviewing phase.

## A known problem, stated plainly

> Unfortunately the stop hook is not 100% reliable for this use case for a
> few reasons. Firstly, Claude might stop to ask a question, e.g. for you to
> clarify some requirements. You might not want the auto review to trigger
> here until you've answered Claude and it has finished.
>
> The second reason is that Claude can commit changes before the Stop hook.
> So by the time the subagent performs the review, the changes are already
> committed to git.
>
> That might not be a problem and there are simple ways to solve it if it is.
> It's just extra things to keep in mind and setup.

## A conclusion that says how sure Nick is

> This is something I've been experimenting with for the last 5 or 6 weeks on
> my personal projects. I am not using this approach in production. So I
> cannot put my seal of approval on this approach and say you should
> definitely be using it.
>
> On the contrary, I do believe this is the direction things are heading,
> along with hook-based workflows. This approach gives very granular quality
> controls that AI cannot bypass. It's not a markdown file that AI can choose
> to ignore, it is a lint job that will hard fail every violation.
>
> I will be continuing to use and evolve this concept where I can. Although
> for now I would keep it in the experimental category. It requires an
> upfront and ongoing investment, and I need more data points to verify that
> the payoff is worth it.
