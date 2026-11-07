# What Nick catches

These are the classes of defect Nick finds when he reviews. They were read off
his own review comments, so they are what he would look for rather than a
generic checklist. Hunt for all of them on every review.

Never edit this file during a review.

A class is a place to look, never a thing to report on its own. A finding says
what is wrong in this diff, on this line, with the evidence.

## In the code

1. **The error disappears.** A catch-all swallows the exception, a failure is
   printed while the exit status stays 0, or a parser falls through to a
   default instead of refusing the input. Ask what a timeout looks like to the
   caller, and whether a real failure can be told apart from an empty result.

2. **A default nobody sets.** An environment variable or a constant with a
   fallback value, where nothing in the repository sets the real one. Ask what
   happens on the day the project moves past that value.

3. **Silent truncation.** A hardcoded page size, a first page fetched without
   pagination, a limit applied without saying so. Ask what the caller gets when
   there is more than the limit.

4. **A pattern matches more than it means.** A regular expression, a prefix
   test or an equality check that also matches something it was never meant to.
   Work out a real input that slips through, and put it in the finding.

5. **Two runs at once.** Two pipelines, two jobs or two requests doing the same
   work on the same thing. Check what serialises them, and say so when nothing
   does.

6. **The same value in 2 places.** A constant, a status id, a rule or a piece
   of guidance written twice. Name both locations.

7. **Past a limit the repository already sets.** Nesting, function length, file
   length, a count of assertions. Find the rule the repository enforces
   somewhere else, quote it, then give the number you measured.

8. **Built by hand where a library does it.** A watch mode, a changed-files
   filter, a report format, a parser, focus management. Name the library
   already in the project and the feature it has.

9. **A rule of the repository broken.** The instructions for agents, the
   contributing guide, the architecture records, a package's own readme. Quote
   the rule, then show the line.

10. **The comment no longer matches the code.** Numbers, names and claims in a
    comment that the code around it has moved past.

11. **The wrong kind of content for the document.** Internals described in an
    external contract, history in a document about the present, the vocabulary
    of how the team organises work left in the code.

12. **A reader cannot follow it.** A passage that takes 3 readings, a rule
    stated without an example, structure buried in one long paragraph. Say
    plainly that you could not follow it.

13. **A default in one language.** A label, a message or a format defaulting to
    one language where the other props are required.

14. **A report that copies out what it found.** A check that prints the
    sensitive value it detected into a log, a report or an artefact.

15. **Domain code shared between contexts.** A shared kernel of domain types, a
    concept forced into one owning context, coupling the architecture forbids.

16. **Writing that breaks Nick's grammar rules.** Every word a person reads is
    writing: a document, a readme, an architecture record, a story, a code
    comment, a docstring, a log message, a commit message, the merge request
    description, the text of a test name. His rules are in
    `~/.claude/output-styles/nick-grammar-rules.md`. See *The grammar pass* in
    `SKILL.md` for how to run it.

## Against the spec

The spec is the card the merge request cites. Read its acceptance criteria and
check the diff against each one.

A gap that would fail one of the card's criteria is a finding. A gap that would
not is a finding of its own, and it says so, because giving a card a second
subject is what makes it unbuildable later.
