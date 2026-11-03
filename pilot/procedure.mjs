#!/usr/bin/env node
// Tools for the steps of pilot/PROCEDURE.md.
//
//   node pilot/procedure.mjs statement <corpus> <claim-id>
//       Step 3. Copy the claim's statement into its formal file, verbatim.
//       If the statement changed, the states, fidelity, note and ratified
//       lines are removed: the file must go through steps 4 to 6 again.
//
//   node pilot/procedure.mjs packet <corpus> <claim-id> <A|B|C>
//       Steps 3 to 5. Print what one role is given, and nothing else:
//         A (formalizer)     the statement and the vocabulary
//         B (stater)         the claim's rules and the predicate lines they use
//         C (example writer) the statement and the predicate lines
//       Each packet starts with that role's instructions.
//
//   node pilot/procedure.mjs examples <corpus> <claim-id> [--write]
//       Step 5. Run each example in <corpus>/examples/<slug>.dl against the
//       claim's rules and the rules of the definitions it uses, and report
//       whether the verdict matched. --write records the tally in the
//       formal file's "% examples:" line.
//
//   node pilot/procedure.mjs set <corpus> <claim-id> <field> <text>
//       Write one header line (states, fidelity, note, ratified) of a
//       formal file, replacing any earlier value.
//
// The vocabulary of a claim is the predicate lines ("% predicate p(X, Y):
// meaning") and rules of the definitions it uses, directly or through other
// definitions. Formal files are <corpus>/formal/<slug>.dl, where <slug> is
// the id without its "claim:" or "def:" prefix ("def-" is added for a
// definition).

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseCollection } from "../src/parse.js";
import { parseProgram, evaluate } from "../src/datalog.js";

const HEADER = ["formalizes", "statement", "states", "examples", "fidelity", "note", "ratified"];
const usage = () => {
  console.error("usage: node pilot/procedure.mjs statement|packet|examples|set <corpus> <claim-id> ...");
  process.exit(2);
};

const [cmd, corpusArg, id, ...rest] = process.argv.slice(2);
if (!cmd || !corpusArg || !id) usage();
const corpus = resolve(corpusArg);

// ---------- the graph and the formal files ----------

async function walk(dir, ext) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p, ext)));
    else if (ent.name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

const dagDir = join(corpus, "dag");
const graph = parseCollection(await Promise.all((await walk(dagDir, ".md")).map(async (p) => ({ path: relative(dagDir, p), text: await readFile(p, "utf8") }))));
const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
const claim = nodes.get(id);
if (!claim) { console.error(`no node ${id} in ${corpusArg}/dag`); process.exit(2); }

// A node's file name: "def-<name>" for a definition; for a claim, the id
// without "claim:" and without the corpus prefix ("claim:lib-2a" -> "2a").
const slugOf = (nid) => (nid.startsWith("def:") ? "def-" + nid.slice(4) : nid.replace(/^claim:/, "").replace(/^[a-z]+-/, ""));
const readOr = async (p, d = "") => { try { return await readFile(p, "utf8"); } catch { return d; } };
// The formal file is the one whose "% formalizes:" header names the node;
// a node with none gets <slug>.dl.
const byHeader = new Map();
for (const p of await walk(join(corpus, "formal"), ".dl")) {
  const m = /^%\s*formalizes:\s*(\S+)/m.exec(await readFile(p, "utf8"));
  if (m && !byHeader.has(m[1])) byHeader.set(m[1], p);
}
const formalPath = (nid) => byHeader.get(nid) || join(corpus, "formal", slugOf(nid) + ".dl");

// A formal file: header lines ("% field: value"), other comments, and rules.
function splitFile(text) {
  const header = new Map();
  const body = [];
  for (const line of text.split("\n")) {
    const m = /^%\s*([a-z]+):\s?(.*)$/.exec(line);
    if (m && HEADER.includes(m[1])) header.set(m[1], m[2].trim());
    else body.push(line);
  }
  while (body.length && body[body.length - 1] === "") body.pop();
  return { header, body };
}
function joinFile({ header, body }) {
  const lines = HEADER.filter((f) => header.has(f)).map((f) => `% ${(f + ":").padEnd(11)} ${header.get(f)}`);
  return [...lines, ...body].join("\n").replace(/\n*$/, "\n");
}
const rulesOf = (text) => text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("%")).join("\n");

// The definitions a claim uses, directly or through other definitions.
function definitionsOf(nid) {
  const seen = new Set();
  const stack = graph.edges.filter((e) => e.from === nid && ["uses", "mentions"].includes(e.kind)).map((e) => e.to);
  while (stack.length) {
    const d = stack.pop();
    if (seen.has(d) || nodes.get(d)?.type !== "definition") continue;
    seen.add(d);
    stack.push(...graph.edges.filter((e) => e.from === d && ["uses", "mentions"].includes(e.kind)).map((e) => e.to));
  }
  return [...seen].sort();
}

const PRED_RE = /^%\s*predicate\s+([a-z_][A-Za-z0-9_]*)\(([^)]*)\):\s*(.*)$/;
async function vocabulary(defIds) {
  const preds = []; // { name, args, meaning, def }
  const rules = []; // { def, text }
  for (const d of defIds) {
    const text = await readOr(formalPath(d));
    for (const line of text.split("\n")) {
      const m = PRED_RE.exec(line);
      if (m) preds.push({ name: m[1], args: m[2].trim(), meaning: m[3].trim(), def: d });
    }
    const r = rulesOf(text);
    if (r) rules.push({ def: d, text: r });
  }
  return { preds, rules };
}
async function allPredicateLines() {
  const defs = graph.nodes.filter((n) => n.type === "definition").map((n) => n.id);
  return (await vocabulary(defs)).preds;
}

const statementOf = (n) => (n.value || "").trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ");
const predicatesIn = (text) => {
  const out = new Set();
  for (const r of parseProgram(text)) for (const l of [r.head, ...r.body]) if (l.kind === "atom" && l.pred !== "bottom") out.add(l.pred);
  return [...out].sort();
};

// ---------- instructions per role ----------

const SYNTAX = `Datalog, as this evaluator reads it:
- A fact: p(a, b).   A rule: h(X) :- b1(X, Y), b2(Y).   (h holds whenever b1 and b2 hold)
- A prohibition: bottom :- b1(X), b2(X).   (b1 and b2 must never hold together)
- Variables start with a capital or _; constants are lowercase words, "quoted strings" or integers.
- In a body: not p(X) (no p(X) is known; X must also appear in a positive literal), X != Y, X = Y, X < Y (integers).
- No "or" in a head, no new objects in a head (no "there exists"), no arithmetic, no function symbols.
- Lines starting with % are comments.`;

const INSTRUCTIONS = {
  A: `ROLE: formalizer (A). Write Datalog rules that say exactly what the STATEMENT says: no more, no less.
Use only the predicates in the VOCABULARY; the vocabulary's own rules are in force alongside yours.
If you need a predicate that is not listed, do not invent it: list it under MISSING with a proposed predicate line.
If the statement, or part of it, cannot be said in this language, say which part and why under CANNOT.
Answer with exactly these sections:
RULES
<the rules, or nothing>
MISSING
<one "% predicate name(Args): meaning" line per missing predicate, or "none">
CANNOT
<what cannot be said and why, or "none">

${SYNTAX}`,
  B: `ROLE: stater (B). Below are Datalog RULES and the meaning of each predicate they use.
Write, in plain English, exactly what the rules say: no more and no less. Do not guess what they are for,
where they come from, or what else might be true. If a rule permits or forbids something only under a
condition, say the condition. Answer with the English only, in one to three sentences.

${SYNTAX}`,
  C: `ROLE: example writer (C). From the STATEMENT, write at least two small cases, as facts in the VOCABULARY:
at least one the statement forbids, and at least one it allows, or one in which it requires a conclusion.
Write each case from the statement alone; you have not seen and should not guess at any rules.
Answer with exactly this format, one block per case, and nothing else:
% example:  <one line of English describing the case>
% expect:   forbidden | allowed | expects <one fact, e.g. member(m1)>
<facts>

Use only predicates in the vocabulary. Constants are lowercase words such as m1, c1, r1.

${SYNTAX}`,
};

// ---------- commands ----------

if (cmd === "statement") {
  const p = formalPath(id);
  const file = splitFile(await readOr(p));
  const s = statementOf(claim);
  if (!s) { console.error(`${id} has no statement`); process.exit(1); }
  const changed = file.header.get("statement") !== s;
  file.header.set("formalizes", id);
  file.header.set("statement", s);
  // The old annotation lines this procedure replaces.
  file.body = file.body.filter((l) => !/^%\s*(claim|says|definition):/.test(l));
  if (changed) for (const f of ["states", "examples", "fidelity", "note", "ratified"]) file.header.delete(f);
  await writeFile(p, joinFile(file));
  console.log(`${relative(process.cwd(), p)}: statement ${changed ? "written; states, examples, fidelity, note and ratified cleared" : "unchanged"}`);
} else if (cmd === "packet") {
  const role = (rest[0] || "").toUpperCase();
  if (!INSTRUCTIONS[role]) usage();
  const out = [INSTRUCTIONS[role], ""];
  const voc = await vocabulary(definitionsOf(id));
  const predLines = (ps) => ps.map((q) => `% predicate ${q.name}(${q.args}): ${q.meaning}`).join("\n") || "(none)";
  if (role === "A" || role === "C") {
    out.push("STATEMENT", statementOf(claim), "", "VOCABULARY", predLines(voc.preds));
    if (role === "A") out.push("", "VOCABULARY RULES (in force alongside yours)", voc.rules.map((r) => r.text).join("\n") || "(none)");
  } else {
    const text = rulesOf(await readOr(formalPath(id)));
    if (!text) { console.error(`${id} has no rules yet`); process.exit(1); }
    const all = await allPredicateLines();
    const used = predicatesIn(text);
    const missing = used.filter((n) => !all.some((q) => q.name === n));
    if (missing.length) console.error(`warning: no predicate line for ${missing.join(", ")}`);
    out.push("RULES", text, "", "PREDICATES", predLines(all.filter((q) => used.includes(q.name))));
    if (missing.length) out.push(...missing.map((n) => `% predicate ${n}(...): (no meaning given)`));
  }
  console.log(out.join("\n"));
} else if (cmd === "examples") {
  const exText = await readOr(join(corpus, "examples", slugOf(id) + ".dl"));
  if (!exText.trim()) { console.error(`no examples file for ${id}`); process.exit(1); }
  const blocks = exText.split(/^(?=%\s*example:)/m).filter((b) => /%\s*example:/.test(b));
  const own = rulesOf(await readOr(formalPath(id)));
  const voc = await vocabulary(definitionsOf(id));
  const program = [...voc.rules.map((r) => r.text), own].join("\n");
  let pass = 0;
  for (const b of blocks) {
    const what = /%\s*example:\s*(.*)/.exec(b)[1].trim();
    const expect = (/%\s*expect:\s*(.*)/.exec(b) || [, ""])[1].trim();
    const facts = {};
    let ok = false, got = "";
    try {
      for (const r of parseProgram(rulesOf(b))) {
        if (r.body.length) throw new Error("an example holds facts only");
        (facts[r.head.pred] ||= []).push(r.head.args.map((t) => t.const));
      }
      const db = evaluate(parseProgram(program), facts);
      const bottom = (db.get("bottom") || []).length > 0;
      if (expect === "forbidden") { ok = bottom; got = bottom ? "forbidden" : "allowed"; }
      else if (expect === "allowed") { ok = !bottom; got = bottom ? "forbidden" : "allowed"; }
      else if (expect.startsWith("expects ")) {
        const [goal] = parseProgram(expect.slice(8).replace(/\.?\s*$/, "."));
        const want = goal.head.args.map((t) => t.const);
        const found = (db.get(goal.head.pred) || []).some((t) => t.length === want.length && t.every((x, i) => x === want[i]));
        ok = found && !bottom;
        got = bottom ? "forbidden" : found ? "derived" : "not derived";
      } else got = `unknown expectation "${expect}"`;
    } catch (e) { got = `error: ${e.message}`; }
    if (ok) pass++;
    console.log(`${ok ? "pass" : "FAIL"}  ${what}   [expected ${expect}; got ${got}]`);
  }
  const tally = `${pass} of ${blocks.length} pass`;
  console.log(tally);
  if (rest.includes("--write")) {
    const p = formalPath(id);
    const file = splitFile(await readOr(p));
    file.header.set("examples", tally);
    await writeFile(p, joinFile(file));
  }
  process.exit(pass === blocks.length ? 0 : 1);
} else if (cmd === "set") {
  const [field, ...words] = rest;
  if (!["states", "fidelity", "note", "ratified"].includes(field) || !words.length) usage();
  const p = formalPath(id);
  const file = splitFile(await readOr(p));
  file.header.set(field, words.join(" ").replace(/\s+/g, " ").trim());
  await writeFile(p, joinFile(file));
  console.log(`${relative(process.cwd(), p)}: ${field} set`);
} else usage();
