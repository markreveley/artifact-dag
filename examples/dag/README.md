This folder is an example collection, small enough to read in one sitting.
Copy its folders into a project's `dag/` as a starter, or try the tools on
it: `npm run check -- examples/dag --lint`. It passes the lint; the one info
note is `def:proposition`, a root term with nothing to build on.

`claim:simpsons-paradox-example` is linked but deliberately absent, to show how
an external node is reported.

`resources/` holds two links filed under the definitions they are about,
through `topics`.

Not shown here: `refines`, a document decomposed into claims (`document`,
`section`, `order`), `not_links`, and a `scale`. The lint fixtures in
`test/fixtures/lint/` have all but the first, but they are built to trip the
linter, so they are not a model to copy.
