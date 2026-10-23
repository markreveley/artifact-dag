# Using the DAG in a Claude project

This guide is written for the place the DAG lives: a project in the Claude
app. There is no terminal there and no file editor, so everything below is
phrased as what you see in the project and what you say to Claude.

## What you are looking at

A project that uses the DAG has three visible parts:

1. **Node files.** Markdown files under `dag/` in the project's files, one
   per definition or claim. They are the source of truth. The format is in
   [SCHEMA.md](../SCHEMA.md).
2. **The viewer.** A Claude artifact, published once per project, that reads
   `dag/` directly and draws the graph. Open it from the project's artifacts.
3. **This repo**, attached to the project. Claude in any thread of the project
   can see it, which is how it knows the node format, the commands below, and
   how to publish or rebuild the viewer. You never need to open it.

The viewer reads the files every time it loads. To keep that to a few calls,
`dag/_bundle.json` holds every node's text in one file; Claude rebuilds it
after each change. Files changed since the last bundle are read one by one,
so loading slows down, but stays correct, if the bundle falls behind.

## Reading the graph

- Pills are definitions, boxes are claims. The small label above a title is
  the type or, for a claim, its subtype.
- Arrows point from a node to what it builds on: a claim points at the
  definitions it `uses`, a definition points at the narrower term it
  `refines`. Green is `supports`, red dashed is `contradicts`, faint lines
  are `mentions` and `about`.
- A dashed outline is an **external** node: something linked from this
  project but not defined in it. It may live in another project's `dag/`,
  or still need writing.
- Click a node to read it in full: the meta-definition or claim text, the
  attributed sub-definitions, sources, and every edge in and out. Links in
  the text jump to that node.
- Filters hide a type; search dims everything that doesn't match on id,
  title, alias or tag. Scroll to zoom, drag to pan, **Fit** to reset.
- The **document** picker (shown once any claim has a `document` field)
  narrows the graph to one document's claims and what they build on, and
  lists those claims in reading order, grouped by section. A claim from a
  document shows previous and next links, so you can read the document
  decomposed, one claim at a time.
- The **problems** button lists what the validator found: missing fields,
  bad ids, duplicates, cycles, and (as notes, not errors) external links.
- **Reload** re-reads the files. A file written in the last few seconds can
  take a moment to appear.

The first time you open a viewer it asks whether the page may read this
project's files. If you decline, or the viewer is opened by someone who is
not in the project, it shows the built-in example collection with a banner
saying so.

## Adding and editing nodes

The project view has no file editor, so nodes are edited by asking Claude in
a thread. Any thread in the project will do; Claude reads this repo's
`dag` skill and knows the format. Plain language works:

> Add a definition of "calibration" with Tetlock's version as a
> sub-definition, and link it to credence.

or the shorter command forms below. Claude writes or changes the file under
`dag/`, runs the validator, rebuilds the bundle, and reports. Press **Reload** in the viewer to see
it.

Other routes into `dag/`:

- **Upload a file.** A `.md` dropped into the project lands in the uploads
  folder under an opaque name, so follow it with "file this under dag/" and
  Claude moves and validates it.
- **Edit on your computer.** If you keep a copy of `dag/` in a folder Claude
  can reach on your device, say "sync dag/ from my folder" and Claude copies
  it into the project's files. The viewer never reads your device directly.

You do not need to turn node files into Claude Docs. The viewer reads
Markdown files from the project's files, and a Claude Doc is a different
kind of object that it cannot see.

## Checking the graph (dagcheck)

`bin/dagcheck.js` is the validator as a command line tool. In the project
view you don't run it; you ask for it:

> dag check

Claude runs it against `dag/` and posts the report: node counts, edge counts,
and every problem with the file it came from. The viewer runs the same parser
on the same files, so its problems button shows the same findings without
asking. Use `dag check` when you want the report in the thread, for example
before a batch of edits, or to get the graph as JSON.

`dag lint` adds the linter: rules that look for missing links rather than
broken files. It reports, for example, a definition whose text names another
term without linking it, a claim with no edge to any other claim, or a
claim that depends on one later in its document. It only reports; each
finding is decided by adding the link or by noting in the node that the word
means something else (`not_links`, see `SCHEMA.md`), and then it stays quiet.

## Commands

These are conventions for talking to Claude in a project thread, not a
language the app enforces. Claude reads them from this repo's `dag` skill.
Anything you'd say in a sentence works too; the short forms exist so a
request is unambiguous.

| say                                     | Claude does                                                        |
|-----------------------------------------|--------------------------------------------------------------------|
| `dag check`                             | runs the validator on `dag/` and posts the report                  |
| `dag check --json`                      | same, and attaches the parsed graph as `graph.json`                |
| `dag lint`                              | runs the link linter on `dag/` and posts its findings              |
| `dag list`                              | lists every node id with its title, grouped by type                |
| `dag show <id>`                         | posts the node's file contents                                     |
| `dag add def <term>`                    | creates `dag/definitions/<slug>.md` and asks for or drafts the text |
| `dag add claim <statement>`             | creates `dag/claims/<slug>.md`, subtype `proposition` unless told  |
| `dag link <id> <kind> <id>`             | adds an edge field, e.g. `dag link claim:x uses def:y`             |
| `dag unlink <id> <kind> <id>`           | removes one                                                        |
| `dag rename <id> <new-id>`              | renames the node and every link to it in this project              |
| `dag externals`                         | lists ids linked but not defined here                              |
| `dag publish`                           | builds the viewer for this project and publishes it as an artifact |
| `dag republish`                         | rebuilds and updates the project's existing viewer                 |
| `dag push`                              | sends this project's nodes to the federation view                  |

Ids are global on purpose: use the same `def:credence` in every project
that means the same thing, and the graphs can be joined later.

## Setting up a new project

1. In the project's settings, add `markreveley/artifact-dag` to its
   repositories.
2. Start a thread and say `dag publish`. Claude creates `dag/` if it is
   missing (offering the example collection as a starter), builds the page
   for this project, and publishes it with permission to read the
   project's files. It posts the link.
3. Open the viewer, allow it to read the project's files, and start adding
   nodes.

Each project gets its own viewer because an artifact can read the files of
only one project. Cross-project links still work: they show as external
nodes until a federation view (planned, step 4) unions the projects.

## Seeing several projects together (federation)

Each project's viewer shows only that project, because an artifact can
read only one project's files. The **federation view** joins them: it shows
the DAG project's `dag/` live, plus a copy of every other project's nodes
that was pushed to it.

- To add a project, or refresh it after edits, say `dag push` in a thread
  of that project. Claude copies the project's nodes into the federation
  view's database. Nothing changes in the project itself.
- In the federation view, a node linked from one project and defined in
  another is a real node, not an external one. A **Project** menu narrows
  the graph to one project and whatever it links to elsewhere.
- If two projects define the same id, the first wins (the DAG project, then
  the others by name) and the problems list says where else it is defined.
- Pushed copies are only as fresh as the last `dag push`.
- Anyone you share the federation view with can read every pushed project's
  nodes, even without access to those projects. It is private to you until
  you share it.

## Limits worth knowing

- The viewer is read-only. It cannot create or change files; that is what
  threads are for.
- One viewer reads one project. Someone outside the project sees the
  example collection, not your files.
- The parser accepts a deliberate subset of YAML. Keep frontmatter flat.
- Project files are shared by every thread in the project, and the last
  write wins, so two threads editing the same node at once will lose one
  edit. Keep node edits in one thread at a time.
