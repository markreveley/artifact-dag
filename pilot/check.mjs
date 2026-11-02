#!/usr/bin/env node
// Entailment check for the formal-nodes pilot (see pilot/README.md).
//   node pilot/check.mjs <corpus> [--json] [--no-bridges]
// <corpus>/dag holds the nodes and <corpus>/formal/*.dl the formal text, one
// node per file, headed by a line "% formalizes: <id>". For every claim that
// has formal text and something to rest on (a depends_on, or a definition it
// uses), the program is the formal text of everything it rests on: the
// claims reached through depends_on, and the definitions that it or any of
// them uses or mentions. Each rule of the claim is then checked:
//   follows   a fact is derived; or, for H :- B, the body B frozen (each
//             variable a fresh constant) and added as facts lets the
//             premises derive H. A head "bottom" is a constraint.
//   fails     H is not derived.
//   vacuous   frozen B lets the premises derive bottom, so B cannot happen.
//   denied    a "not p(...)" of B is derived, so the frozen case is not one
//             the rule speaks of.
// When a rule follows, two mutations run: each positive literal of B is
// dropped in turn (an "idle" literal is one H follows without), and each
// direct depends_on is dropped in turn (an "unneeded" premise is one H
// still follows without). --no-bridges leaves out claims with subtype
// "bridge", to show the result before bridges were added.

import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseCollection } from "../src/parse.js";
import { parseProgram, evaluate } from "../src/datalog.js";

const argv = process.argv.slice(2);
const corpus = argv.find((a) => !a.startsWith("--"));
if (!corpus) {
  console.error("usage: node pilot/check.mjs <corpus> [--json] [--no-bridges]");
  process.exit(2);
}
const JSON_OUT = argv.includes("--json");
const NO_BRIDGES = argv.includes("--no-bridges");

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

// ---------- the graph ----------

const dagDir = resolve(corpus, "dag");
const mdFiles = await walk(dagDir, ".md");
const graph = parseCollection(await Promise.all(mdFiles.map(async (p) => ({ path: relative(dagDir, p), text: await readFile(p, "utf8") }))));
const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
const dropped = new Set(NO_BRIDGES ? graph.nodes.filter((n) => n.subtype === "bridge").map((n) => n.id) : []);
const edgesFrom = (from, kinds) => graph.edges.filter((e) => e.from === from && kinds.includes(e.kind) && !dropped.has(e.to)).map((e) => e.to);

// ---------- the formal text ----------

const formal = new Map(); // id -> [{ file, text }]
const fidelity = new Map(); // id -> { level, reason }, from a "% fidelity:" line
for (const p of await walk(resolve(corpus, "formal"), ".dl")) {
  const text = await readFile(p, "utf8");
  const m = /^%\s*formalizes:\s*(\S+)/m.exec(text);
  const file = relative(corpus, p);
  if (!m) { console.error(`${file}: no "% formalizes: <id>" header`); process.exit(2); }
  if (!nodes.has(m[1])) { console.error(`${file}: formalizes an unknown node, ${m[1]}`); process.exit(2); }
  if (!formal.has(m[1])) formal.set(m[1], []);
  formal.get(m[1]).push({ file, text });
  const f = /^%\s*fidelity:\s*(yes|strained|no)\b[\s,:—-]*(.*)$/m.exec(text);
  if (f) fidelity.set(m[1], { level: f[1], reason: f[2].trim() });
}
const textOf = (id) => (formal.get(id) || []).map((f) => f.text).join("\n");

// Everything a claim rests on: claims through depends_on, transitively, and
// the definitions it or any of them uses or mentions (and those definitions'
// own). `without` leaves one claim out altogether, wherever it is reached.
function premisesOf(id, without = null) {
  const claims = [];
  const seen = new Set();
  const stack = edgesFrom(id, ["depends_on"]).filter((d) => d !== without);
  while (stack.length) {
    const c = stack.pop();
    if (seen.has(c) || !nodes.has(c) || c === without) continue;
    seen.add(c);
    claims.push(c);
    stack.push(...edgesFrom(c, ["depends_on"]));
  }
  const defs = [];
  const dseen = new Set();
  const dstack = [id, ...claims].flatMap((c) => edgesFrom(c, ["uses", "mentions"]));
  while (dstack.length) {
    const d = dstack.pop();
    if (dseen.has(d) || nodes.get(d)?.type !== "definition") continue;
    dseen.add(d);
    defs.push(d);
    dstack.push(...edgesFrom(d, ["uses", "mentions"]));
  }
  return { claims, defs };
}

// ---------- the check ----------

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const derived = (db, pred, tuple) => (db.get(pred) || []).some((t) => same(t, tuple));
const value = (term, frozen) => ("var" in term ? frozen.get(term.var) : term.const);

// Freeze a body: positive atoms become facts over fresh constants. Returns
// null when a comparison cannot hold under freezing.
function freeze(body, skip = -1) {
  const vars = [];
  const seen = new Set();
  const note = (t) => { if ("var" in t && !seen.has(t.var)) { seen.add(t.var); vars.push(t.var); } };
  for (const l of body) (l.kind === "atom" ? l.args : [l.left, l.right]).forEach(note);
  // Variables under "<" get integers in an order that satisfies every "<"
  // between two variables; a cycle means no order exists. The rest get strings.
  const less = body.filter((l) => l.kind === "cmp" && l.op === "<");
  const ordered = [...new Set(less.flatMap((l) => [l.left, l.right]).filter((t) => "var" in t).map((t) => t.var))];
  const below = new Map(ordered.map((v) => [v, less.filter((l) => "var" in l.right && l.right.var === v && "var" in l.left).map((l) => l.left.var)]));
  const frozen = new Map();
  let n = 0;
  const visit = (v, path) => {
    if (frozen.has(v)) return true;
    if (path.has(v)) return false;
    path.add(v);
    for (const u of below.get(v)) if (!visit(u, path)) return false;
    frozen.set(v, ++n);
    return true;
  };
  for (const v of ordered) if (!visit(v, new Set())) return null;
  for (const v of vars) if (!frozen.has(v)) frozen.set(v, `?${v}`);
  const facts = {};
  body.forEach((l, i) => {
    if (l.kind !== "atom" || l.neg || i === skip) return;
    (facts[l.pred] ||= []).push(l.args.map((t) => value(t, frozen)));
  });
  for (const l of body) {
    if (l.kind !== "cmp") continue;
    const a = value(l.left, frozen), b = value(l.right, frozen);
    if (l.op === "!=" && a === b) return null;
    if (l.op === "=" && a !== b) return null;
    if (l.op === "<" && !(typeof a === "number" && typeof b === "number" && a < b)) return null;
  }
  return { frozen, facts };
}

// Run one rule of `id` against the premises `program` (text). Returns a
// status and what was derived.
function run(rule, program, skip = -1) {
  const fz = freeze(rule.body, skip);
  if (!fz) return { status: "unsupported", note: "a comparison cannot hold under freezing" };
  let db;
  try { db = evaluate(parseProgram(program), fz.facts); }
  catch (e) { return { status: "error", note: e.message }; }
  const head = rule.head.args.map((t) => value(t, fz.frozen));
  const ok = derived(db, rule.head.pred, head);
  const bottom = rule.head.pred !== "bottom" && derived(db, "bottom", []);
  const denied = rule.body.filter((l) => l.kind === "atom" && l.neg && derived(db, l.pred, l.args.map((t) => value(t, fz.frozen)))).map(show);
  if (denied.length) return { status: "denied", note: `derived: ${denied.join(", ")}` };
  if (bottom) return { status: "vacuous", note: "the frozen body lets the premises derive bottom" };
  return { status: ok ? "follows" : "fails" };
}

function show(l) {
  if (l.kind === "cmp") return `${showT(l.left)} ${l.op} ${showT(l.right)}`;
  return `${l.neg ? "not " : ""}${l.pred}(${l.args.map(showT).join(", ")})`;
}
const showT = (t) => ("var" in t ? t.var : typeof t.const === "string" ? t.const : String(t.const));
const showRule = (r) => `${show({ ...r.head, neg: false })}${r.body.length ? " :- " + r.body.map(show).join(", ") : ""}.`;

const results = [];
const claims = graph.nodes.filter((n) => n.type === "claim" && !dropped.has(n.id)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
for (const claim of claims) {
  const own = textOf(claim.id);
  const direct = edgesFrom(claim.id, ["depends_on"]);
  const rec = { id: claim.id, title: claim.title, fidelity: fidelity.get(claim.id), rules: [] };
  if (!own) { rec.status = "not formalized"; results.push(rec); continue; }
  const { claims: pc, defs } = premisesOf(claim.id);
  let rules;
  try { rules = parseProgram(own); }
  catch (e) { rec.status = "error"; rec.note = e.message; results.push(rec); continue; }
  if (!rules.length) { rec.status = "no rules"; results.push(rec); continue; }
  if (["axiom", "bridge"].includes(claim.subtype) || (!direct.length && !defs.length)) { rec.status = "premise only"; results.push(rec); continue; }
  const program = [...defs, ...pc].map(textOf).filter(Boolean).join("\n");
  rec.premises = pc;
  rec.definitions = defs;
  for (const rule of rules) {
    const r = { rule: showRule(rule), line: rule.line, ...run(rule, program) };
    if (r.status === "follows") {
      r.idle = rule.body.map((l, i) => (l.kind === "atom" && !l.neg && run(rule, program, i).status === "follows" ? show(l) : null)).filter(Boolean);
      r.unneeded = direct.filter((d) => {
        const { claims: pc2, defs: d2 } = premisesOf(claim.id, d);
        const p2 = [...d2, ...pc2].map(textOf).filter(Boolean).join("\n");
        return run(rule, p2).status === "follows";
      });
    }
    rec.rules.push(r);
  }
  // One word for the claim: the worst of its rules.
  const rank = ["error", "unsupported", "denied", "vacuous", "fails", "follows"];
  rec.status = rec.rules.map((r) => r.status).sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0];
  results.push(rec);
}

// ---------- report ----------

if (JSON_OUT) {
  console.log(JSON.stringify({ corpus, noBridges: NO_BRIDGES, results }, null, 2));
} else {
  const short = (id) => id.replace(/^claim:/, "");
  for (const r of results) {
    console.log(`${r.status.padEnd(14)} ${short(r.id)}  ${r.title}`);
    if (r.fidelity) console.log(`               fidelity ${r.fidelity.level}${r.fidelity.reason ? ": " + r.fidelity.reason : ""}`);
    if (r.note) console.log(`               ${r.note}`);
    for (const x of r.rules || []) {
      const extra = [];
      if (x.note) extra.push(x.note);
      if (x.idle?.length) extra.push(`idle: ${x.idle.join(", ")}`);
      if (x.unneeded?.length) extra.push(`unneeded: ${x.unneeded.map(short).join(", ")}`);
      console.log(`    ${x.status.padEnd(10)} ${x.rule}${extra.length ? "   [" + extra.join("; ") + "]" : ""}`);
    }
  }
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log(Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", "));
  const fid = {};
  for (const r of results) if (r.fidelity) fid[r.fidelity.level] = (fid[r.fidelity.level] || 0) + 1;
  if (Object.keys(fid).length) console.log("fidelity: " + ["yes", "strained", "no"].map((k) => `${fid[k] || 0} ${k}`).join(", "));
}
