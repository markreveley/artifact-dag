# Assertion-Based Knowledge Representation for LLMs

This project explores whether structuring knowledge as **assertion dependency graphs** (DAGs of primitive and compound assertions) produces measurably better LLM adherence to design principles than equivalent knowledge presented as prose.

## Core Concepts

**Primitive assertion**: An atomic, irreducible claim. It cannot be decomposed further within the system. It is the smallest unit the system can reason about. Primitives are files.

**Compound assertion**: A structured composition of primitives via logical connectives (AND, OR, NOT, IMPLIES) with an explicit dependency graph. Compounds are files with associated `deps.json` files listing their primitive dependencies.

**Assertion DAG**: A directed acyclic graph where compound assertions depend on primitive assertions (and potentially other compounds). The graph is the reasoning structure, externalized as files and JSON.

The key distinction from prose instructions: **the composition is explicit**. A compound assertion doesn't just list ideas — it declares which primitives combine and what design decision their combination produces. The LLM receives not just *what* to value but *how those values compose into actions*.

## What is here

```
evals/
  README.md                       this file
  METHODOLOGY.md                  the purity-test eval: method, results, failed approaches, threats to validity
  IMPLICATIONS.md                 theoretical implications and future directions
  LIKELIHOOD_ANALYSIS.md          how likely the result is to hold, and what testing it needs
  CONFLATION.md                   reasoning failures read as conflation rather than hallucination
  CONNECTION_TO_THESIS.md         how assertion DAGs extend the thesis
  ASSERTION_DAGS_THESIS_SECTION.md  a section on assertion DAGs written for the thesis
  NEXT_EXPERIMENT.md              the four-condition experiment (A/B/C/D): design, and how to build it

  conceptual-prototype/           the first prototype (apples, fruit, seeds): the "visible fruit" deduction gap
    primitives/  claims/  diagram.txt  verdict.md
  purity-test/                    the eval: prose (A) against an assertion DAG (B) as context for writing tests
    task.md                       the coding task given to the model
    context_a/prompt.md           prose context (the article's ideas as paragraphs)
    context_b/prompt.md           assertion DAG context (primitives, compounds, deps)
    primitives/  compounds/       6 primitives and 3 compounds with deps.json; also the scoring rubric
    run.sh  score.sh              generate N runs per context; score each against the rubric
    run_tests.sh  tests/          left from the earlier "write a test runner" task (METHODOLOGY.md, "Wrong task alignment"); not used by run.sh or score.sh
    results/                      raw outputs and summary.txt
  dag-vs-prose-reasoning/         a thesis on agent architecture as prose and as a 4-layer DAG, for a reasoning comparison a person runs
    README.md  prose.md  dag/
  knowledge-domains/domains/stable-marriage/   a worked example: an article on the stable marriage problem as a DAG
```

"The thesis", in these documents, is the one `dag-vs-prose-reasoning/`
decomposes: `prose.md` there is a version at the DAG's scope.

The nodes here are this eval's own format (an assertion per file, a
`deps.json` per compound), not `md/governance/SCHEMA.md`'s.

## Quick Start

```bash
cd evals/purity-test/
./run.sh 3       # generate 3 runs per context (6 total LLM calls)
./score.sh       # score all outputs (54 total LLM calls for scoring)
cat results/summary.txt
```

Requires the `claude` CLI (Claude Code), installed and signed in, and `jq`
for `score.sh`.

## Key Finding

In the initial eval (N=3, one task, one model), the assertion DAG produced:
- **Perfect compound adherence**: 9/9 across all runs
- **Near-perfect primitive adherence**: 17/18 across all runs
- **Structurally different code**: the LLM invented new abstractions to satisfy the compound assertions

The prose context produced:
- **Near-zero compound adherence**: 2/9 across all runs
- **Inconsistent primitive adherence**: 10/18 across all runs
- **Uniform code**: same structural approach every time (temp files, no purity separation)

See [METHODOLOGY.md](METHODOLOGY.md) for full details.

## Status

Early-stage experimental. N=3 on one task with one model. The signal is strong but narrow. This is a proof of concept, not a validated result.

Not run yet: the four-condition experiment (`NEXT_EXPERIMENT.md`), the
reasoning comparison in `dag-vs-prose-reasoning/README.md`, and a DAG
of an agent's identity in its system prompt, against identity conflation
(`CONFLATION.md`), which was discussed and not built.

Added to this repo in commit `fa3db1d`. The raw results are as the model
wrote them.
