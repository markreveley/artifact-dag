# md/

Every Markdown document about this repo or its work, in the layout
[repo-template](https://github.com/markreveley/repo-template) sets. Markdown
a tool reads as data (`examples/dag/`, `pilot/`, `evals/`) is content, stays
where its tool expects it, is listed in `.layoutignore`, and is named in the
root README's table.

| folder | holds | file name |
|---|---|---|
| [`governance/`](governance/README.md) | the documents that govern the repo | the five fixed names |
| [`docs/`](docs/README.md) | how to use and work on what the repo holds | `<topic>.md` |
| [`analysis/`](analysis/README.md) | dated findings and recommendations | `YYYY-MM-DD-<slug>/<slug>.md` |
| [`research/`](research/README.md) | dated surveys of tools and prior work outside the repo, with sources; added here, not a template default | `YYYY-MM-DD-<slug>/<slug>.md` |
| [`threads/`](threads/README.md) | the exchange of each working thread | `YYYY-MM-DD-<slug>.md` |

The template's other defaults (`plans/`, `issues/`, `audits/`, `tested/`)
are created when the repo first has one. A survey reports and an analysis
recommends: an analysis that rests on a survey links to it in its
"Sources read".
