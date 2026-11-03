import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readdir, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { parseCollection, parseFile } from "../src/parse.js";
import { termForms, findTerms, toFacts } from "../src/facts.js";
import { lint, findingKey } from "../src/lint.js";

const FIXTURE = fileURLToPath(new URL("./fixtures/lint/", import.meta.url));
const RULES = await readFile(new URL("../lint/rules.dl", import.meta.url), "utf8");

async function load(root) {
  const walk = async (dir) => {
    const out = [];
    for (const ent of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) out.push(...(await walk(p)));
      else if (ent.name.endsWith(".md")) out.push(p);
    }
    return out;
  };
  const paths = await walk(root);
  return parseCollection(await Promise.all(paths.map(async (p) => ({ path: relative(root, p), text: await readFile(p, "utf8") }))));
}

const def = (id, title, extra = "") => ({ id, type: "definition", title, aliases: [], tags: [], value: "", notLinks: [], ...extra });

// ---------- word matching ----------

test("matching is whole word, case-insensitive, with simple plurals", () => {
  const forms = termForms([def("def:belief", "Belief"), def("def:proof", "Proof")]);
  const ids = (text) => findTerms(text, forms).map((h) => `${h.id}=${h.word}`);
  assert.deepEqual(ids("Beliefs and proofs, a BELIEF."), ["def:belief=Beliefs", "def:proof=proofs", "def:belief=BELIEF"]);
  assert.deepEqual(ids("disbelief reproof"), []);
});

test("a longer term wins over the shorter term inside it", () => {
  const forms = termForms([def("def:credence", "Credence"), def("def:prior-credence", "Prior credence")]);
  assert.deepEqual(findTerms("hold the prior  credence", forms).map((h) => h.id), ["def:prior-credence"]);
  assert.deepEqual(findTerms("the prior-credence problem", forms).map((h) => h.id), ["def:prior-credence"]);
});

test("short terms match only in capitals, and then case-sensitively", () => {
  const forms = termForms([def("def:psr", "PSR"), def("def:sub", "sub"), def("def:qed", "QED")]);
  assert.deepEqual(findTerms("the PSR and a psr; sub; QEDs", forms).map((h) => h.word), ["PSR", "QEDs"]);
});

test("a trailing parenthetical is dropped only when the rest is unique", () => {
  const forms = termForms([def("def:necessity", "Necessity (logical)"), def("def:mode", "Mode"), def("def:mode-finite", "Mode (finite)")]);
  const hits = (text) => findTerms(text, forms).map((h) => h.id);
  assert.deepEqual(hits("Necessity holds"), ["def:necessity"]);
  assert.deepEqual(hits("a mode"), ["def:mode"]);
  assert.deepEqual(hits("Mode (finite) is finite"), ["def:mode-finite"]);
});

test("aliases count; wikilinks, link targets and code are not scanned", () => {
  const n = parseFile("x.md", `---
id: def:x
type: definition
title: X thing
---
See [[def:belief|the belief]], [a page](https://example.com/belief), \`belief\` and a degree of belief.`).node;
  const graph = { nodes: [n, def("def:belief", "Belief"), def("def:credence", "Credence", { aliases: ["degree of belief"] })], edges: [] };
  assert.deepEqual(toFacts(graph).names, [["def:x", "def:credence", "degree of belief"]]);
});

test("title_contains says where the other title sits", () => {
  const graph = { nodes: [def("def:credence", "Credence"), def("def:argument", "Argument"), def("def:prior-credence", "Prior credence"),
    def("def:argument-form", "Argument form"), def("def:mode-finite", "Mode (finite)"), def("def:finitude", "Finitude")], edges: [] };
  assert.deepEqual(toFacts(graph).title_contains.sort(), [
    ["def:argument-form", "def:argument", "start"],
    ["def:prior-credence", "def:credence", "end"],
  ]);
});

// ---------- rules on the fixture ----------

const graph = await load(FIXTURE);
const findings = lint(graph, RULES);
const got = (code) => findings.filter((f) => f.code === code).map((f) => [f.node, f.target]);

test("unlinked_term: plain-text names with no edge, unless not_links says so", () => {
  assert.deepEqual(got("unlinked_term").sort(), [
    ["claim:fifth", "def:necessity"],
    ["def:assent", "def:conviction"],
    ["def:belief", "def:proposition"],
  ]);
});

test("linking a narrower sense settles the general word", () => {
  const mk = (id, title, value) => ({ id, type: "definition", title, aliases: [], tags: [], value, notLinks: [], path: id });
  const g = {
    nodes: [mk("def:ground", "Ground", "A reason."), mk("def:sufficient-ground", "Sufficient ground", "A ground that settles the matter."),
      mk("def:axiom", "Axiom", "Rests on grounds.")],
    edges: [{ from: "def:sufficient-ground", to: "def:ground", kind: "refines" }, { from: "def:axiom", to: "def:sufficient-ground", kind: "mentions" }],
  };
  assert.deepEqual(lint(g, RULES).filter((f) => f.code === "unlinked_term").map((f) => f.node), []);
});

test("unlinked_term skips a definition tagged pervasive", () => {
  const mk = (id, title, value, tags = []) => ({ id, type: "definition", title, aliases: [], tags, value, notLinks: [], path: id });
  const g = { nodes: [mk("def:x", "X thing", "Stated by Euclid."), mk("def:euclid", "Euclid", "A geometer.", ["pervasive"])], edges: [] };
  assert.deepEqual(lint(g, RULES).filter((f) => f.code === "unlinked_term"), []);
});

test("narrower_unlinked: title ending in another title, with no edge", () => {
  assert.deepEqual(got("narrower_unlinked"), [["def:prior-credence", "def:credence"]]);
});

test("scale_member: a refining member the scale's text does not link", () => {
  assert.deepEqual(got("scale_member"), [["def:conviction", "def:assent"]]);
});

test("isolated_claim: no claim edge either way", () => {
  assert.deepEqual(got("isolated_claim"), [["claim:fifth", ""]]);
});

test("forward_dependency: depends_on a later claim", () => {
  assert.deepEqual(got("forward_dependency"), [["claim:third", "claim:fourth"]]);
});

test("untagged_use: a doc claim uses a definition without that doc tag", () => {
  assert.deepEqual(got("untagged_use"), [["claim:second", "def:outside"]]);
  assert.match(findings.find((f) => f.code === "untagged_use").message, /not tagged doc-t/);
});

test("unused_doc_term: a doc definition no doc claim uses", () => {
  assert.deepEqual(got("unused_doc_term"), [["def:unused", "doc-t"]]);
});

test("dead_end_definition: no outgoing edge", () => {
  assert.deepEqual(got("dead_end_definition").sort(), [["def:belief", ""], ["def:prior-credence", ""], ["def:proposition", ""]]);
});

test("resources: topics must name definitions, and a resource needs one", () => {
  const res = (slug, topics) => ({ path: `${slug}.md`, text: `---\nid: res:${slug}\ntype: resource\ntitle: ${slug}\nurl: https://example.com/${slug}\n${topics ? `topics: [${topics}]\n` : ""}---\n` });
  const g = parseCollection([
    { path: "a.md", text: "---\nid: def:axioms\ntype: definition\ntitle: Axioms\n---\nStatements taken as true." },
    { path: "c.md", text: "---\nid: claim:c\ntype: claim\ntitle: C\n---\nA claim." },
    res("good", "def:axioms"), res("bad", "claim:c"), res("loose"),
  ]);
  const fs = lint(g, RULES);
  const of = (code) => fs.filter((f) => f.code === code).map((f) => [f.node, f.target]);
  assert.deepEqual(of("topic_not_definition"), [["res:bad", "claim:c"]]);
  assert.deepEqual(of("untopiced_resource"), [["res:loose", ""]]);
});

test("findings sort errors first", () => {
  assert.deepEqual([...new Set(findings.map((f) => f.level))], ["error", "warn", "info"]);
});

// ---------- CLI ----------

const CLI = fileURLToPath(new URL("../bin/dagcheck.js", import.meta.url));
const runCli = (...args) => {
  const opts = typeof args[args.length - 1] === "object" ? args.pop() : {};
  try { return { code: 0, out: execFileSync("node", [CLI, ...args], { encoding: "utf8", stdio: "pipe", ...opts }) }; }
  catch (e) { return { code: e.status, out: e.stdout }; }
};

test("--lint exits 1 on a lint error and --json returns findings", () => {
  const r = runCli(FIXTURE, "--lint", "--json");
  assert.equal(r.code, 1);
  const { problems, findings: fs } = JSON.parse(r.out);
  assert.deepEqual(problems, []);
  assert.equal(fs.length, findings.length);
});

test("without --lint the fixture passes", () => {
  assert.equal(runCli(FIXTURE).code, 0);
});

test("--baseline hides known warnings but never errors", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dagcheck-"));
  const file = join(dir, "baseline.json");
  runCli(FIXTURE, "--lint", "--baseline", file, { env: { ...process.env, CI: "" } }); // a missing baseline is written outside CI
  const keys = JSON.parse(await readFile(file, "utf8"));
  assert.ok(!keys.some((k) => k.startsWith("forward_dependency")));
  // Forget one warning; it is reported again, as are both errors.
  await writeFile(file, JSON.stringify(keys.filter((k) => k !== findingKey({ code: "isolated_claim", node: "claim:fifth", target: "" }))));
  const { findings: fs } = JSON.parse(runCli(FIXTURE, "--lint", "--json", "--baseline", file).out);
  assert.deepEqual(fs.map((f) => f.code).sort(), ["forward_dependency", "isolated_claim", "scale_member"]);
});

test("--baseline refuses a baseline it cannot read, and leaves it alone", async () => {
  const file = join(await mkdtemp(join(tmpdir(), "dagcheck-")), "baseline.json");
  const conflicted = '<<<<<<< HEAD\n["isolated_claim claim:fifth "]\n=======\n[]\n>>>>>>> other\n';
  await writeFile(file, conflicted);
  const r = runCli(FIXTURE, "--lint", "--baseline", file);
  assert.equal(r.code, 2);
  assert.equal(await readFile(file, "utf8"), conflicted);
  await writeFile(file, '{"not": "a list"}');
  assert.equal(runCli(FIXTURE, "--lint", "--baseline", file).code, 2);
});

test("dagcheck reads files in sorted order, as the viewer does", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dagcheck-"));
  const node = (title) => `---\nid: def:same\ntype: definition\ntitle: ${title}\n---\nBody.\n`;
  await writeFile(join(dir, "b.md"), node("B"));
  await writeFile(join(dir, "a.md"), node("A"));
  const g = JSON.parse(runCli(dir, "--json").out);
  assert.deepEqual(g.nodes.map((n) => n.title), ["A"]);
  assert.deepEqual(g.problems.map((p) => `${p.code} ${p.path}`), ["duplicate_id b.md"]);
});

test("a collection rule may derive a number; findings still sort", () => {
  const g = parseCollection([
    { path: "c.md", text: "---\nid: claim:c\ntype: claim\ntitle: C\ndocument: d.md\norder: 3\n---\nb" },
    { path: "e.md", text: "---\nid: claim:e\ntype: claim\ntitle: E\ndocument: d.md\norder: 1\n---\nb" },
  ]);
  const fs = lint(g, RULES + '\nfinding("ordered", "info", N, O) :- in_doc(N, _, O).');
  assert.deepEqual(fs.filter((f) => f.code === "ordered").map((f) => f.target), [3, 1]);
});

test("a flag where the folder should be is a usage error", () => {
  assert.equal(runCli("--lint", FIXTURE).code, 2);
  assert.equal(runCli(FIXTURE, "--lint", "--baseline", "--json").code, 2);
});

test("in CI a missing baseline is an error and is not written", async () => {
  const file = join(await mkdtemp(join(tmpdir(), "dagcheck-")), "baseline.json");
  const r = runCli(FIXTURE, "--lint", "--baseline", file, { env: { ...process.env, CI: "true" } });
  assert.equal(r.code, 2);
  await assert.rejects(readFile(file));
});

test("README.md files are not nodes, so the CLI agrees with the viewer", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dagcheck-"));
  await writeFile(join(dir, "README.md"), "---\nid: def:readme\ntype: definition\ntitle: R\n---\n");
  await writeFile(join(dir, "a.md"), "---\nid: def:a\ntype: definition\ntitle: A\n---\n");
  assert.deepEqual(JSON.parse(runCli(dir, "--json").out).nodes.map((n) => n.id), ["def:a"]);
});
