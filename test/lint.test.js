import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { parseCollection, parseFile } from "../src/parse.js";
import { termForms, findTerms, toFacts } from "../src/facts.js";
import { lint, findingKey } from "../src/lint.js";

const FIXTURE = new URL("./fixtures/lint/", import.meta.url).pathname;
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
  const forms = termForms([def("def:token", "Token"), def("def:hash", "Hash")]);
  const ids = (text) => findTerms(text, forms).map((h) => `${h.id}=${h.word}`);
  assert.deepEqual(ids("Tokens and hashes, a TOKEN."), ["def:token=Tokens", "def:hash=hashes", "def:token=TOKEN"]);
  assert.deepEqual(ids("tokenizer rehash"), []);
});

test("a longer term wins over the shorter term inside it", () => {
  const forms = termForms([def("def:token", "Token"), def("def:access-token", "Access token")]);
  assert.deepEqual(findTerms("send the access  token", forms).map((h) => h.id), ["def:access-token"]);
  assert.deepEqual(findTerms("the access-token risk", forms).map((h) => h.id), ["def:access-token"]);
});

test("short terms match only in capitals, and then case-sensitively", () => {
  const forms = termForms([def("def:op", "OP"), def("def:sub", "sub"), def("def:xid", "XID")]);
  assert.deepEqual(findTerms("the OP and an op; sub; XIDs", forms).map((h) => h.word), ["OP", "XIDs"]);
});

test("a trailing parenthetical is dropped only when the rest is unique", () => {
  const forms = termForms([def("def:c2", "C2 (managed)"), def("def:agent", "Agent"), def("def:agent-product", "Agent (product)")]);
  const hits = (text) => findTerms(text, forms).map((h) => h.id);
  assert.deepEqual(hits("C2 holds it"), ["def:c2"]);
  assert.deepEqual(hits("an agent"), ["def:agent"]);
  assert.deepEqual(hits("Agent (product) is a product"), ["def:agent-product"]);
});

test("aliases count; wikilinks, link targets and code are not scanned", () => {
  const n = parseFile("x.md", `---
id: def:x
type: definition
title: X thing
---
See [[def:token|the token]], [a page](https://example.com/token), \`token\` and a degree of belief.`).node;
  const graph = { nodes: [n, def("def:token", "Token"), def("def:credence", "Credence", { aliases: ["degree of belief"] })], edges: [] };
  assert.deepEqual(toFacts(graph).names, [["def:x", "def:credence", "degree of belief"]]);
});

test("title_contains says where the other title sits", () => {
  const graph = { nodes: [def("def:token", "Token"), def("def:agent", "Agent"), def("def:access-token", "Access token"),
    def("def:agent-loop", "Agent loop"), def("def:c1", "C1 (custodial)"), def("def:custody", "Custody")], edges: [] };
  assert.deepEqual(toFacts(graph).title_contains.sort(), [
    ["def:access-token", "def:token", "end"],
    ["def:agent-loop", "def:agent", "start"],
  ]);
});

// ---------- rules on the fixture ----------

const graph = await load(FIXTURE);
const findings = lint(graph, RULES);
const got = (code) => findings.filter((f) => f.code === code).map((f) => [f.node, f.target]);

test("unlinked_term: plain-text names with no edge, unless not_links says so", () => {
  assert.deepEqual(got("unlinked_term").sort(), [
    ["claim:fifth", "def:c2"],
    ["def:identity", "def:party"],
    ["def:ladder", "def:step-two"],
  ]);
});

test("linking a narrower sense settles the general word", () => {
  const mk = (id, title, value) => ({ id, type: "definition", title, aliases: [], tags: [], value, notLinks: [], path: id });
  const g = {
    nodes: [mk("def:grant", "Grant", "A permission."), mk("def:capability-grant", "Capability grant", "A grant as a token."),
      mk("def:gate", "Gate", "Verifies grants.")],
    edges: [{ from: "def:capability-grant", to: "def:grant", kind: "refines" }, { from: "def:gate", to: "def:capability-grant", kind: "mentions" }],
  };
  assert.deepEqual(lint(g, RULES).filter((f) => f.code === "unlinked_term").map((f) => f.node), []);
});

test("unlinked_term skips a definition tagged pervasive", () => {
  const mk = (id, title, value, tags = []) => ({ id, type: "definition", title, aliases: [], tags, value, notLinks: [], path: id });
  const g = { nodes: [mk("def:x", "X thing", "Built by Acme."), mk("def:acme", "Acme", "A company.", ["pervasive"])], edges: [] };
  assert.deepEqual(lint(g, RULES).filter((f) => f.code === "unlinked_term"), []);
});

test("narrower_unlinked: title ending in another title, with no edge", () => {
  assert.deepEqual(got("narrower_unlinked"), [["def:access-token", "def:token"]]);
});

test("scale_member: a refining member the scale's text does not link", () => {
  assert.deepEqual(got("scale_member"), [["def:step-two", "def:ladder"]]);
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
  assert.deepEqual(got("dead_end_definition").sort(), [["def:access-token", ""], ["def:identity", ""], ["def:party", ""]]);
});

test("resources: topics must name definitions, and a resource needs one", () => {
  const res = (slug, topics) => ({ path: `${slug}.md`, text: `---\nid: res:${slug}\ntype: resource\ntitle: ${slug}\nurl: https://example.com/${slug}\n${topics ? `topics: [${topics}]\n` : ""}---\n` });
  const g = parseCollection([
    { path: "a.md", text: "---\nid: def:agents\ntype: definition\ntitle: Agents\n---\nSoftware that acts." },
    { path: "c.md", text: "---\nid: claim:c\ntype: claim\ntitle: C\n---\nA claim." },
    res("good", "def:agents"), res("bad", "claim:c"), res("loose"),
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

const CLI = new URL("../bin/dagcheck.js", import.meta.url).pathname;
const runCli = (...args) => {
  try { return { code: 0, out: execFileSync("node", [CLI, ...args], { encoding: "utf8", stdio: "pipe" }) }; }
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
  runCli(FIXTURE, "--lint", "--baseline", file);
  const keys = JSON.parse(await readFile(file, "utf8"));
  assert.ok(!keys.some((k) => k.startsWith("forward_dependency")));
  // Forget one warning; it is reported again, as are both errors.
  await writeFile(file, JSON.stringify(keys.filter((k) => k !== findingKey({ code: "isolated_claim", node: "claim:fifth", target: "" }))));
  const { findings: fs } = JSON.parse(runCli(FIXTURE, "--lint", "--json", "--baseline", file).out);
  assert.deepEqual(fs.map((f) => f.code).sort(), ["forward_dependency", "isolated_claim", "scale_member"]);
});
