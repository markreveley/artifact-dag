#!/usr/bin/env node
// Run a corpus's formal text as one program over a scenario of facts, and
// report which rules it breaks and what it derives. The other use of formal
// nodes: not checking an argument, but running the norms.
//   node pilot/scenario.mjs <corpus> <scenario.dl> [--show pred,pred,...]
// Every "bottom :- B." becomes violation(<node id>) :- B., so a broken rule
// names the claim that states it. The scenario file holds facts only.
// Without --show, every predicate the rules derive is shown.

import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseProgram, evaluate } from "../src/datalog.js";

const argv = process.argv.slice(2);
// --show takes its list after a space or an "=".
const si = argv.findIndex((a) => a === "--show" || a.startsWith("--show="));
const showList = si < 0 ? null : argv[si] === "--show" ? argv[si + 1] : argv[si].slice(7);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(si >= 0 && argv[si] === "--show" && i === si + 1));
const [corpus, scenario] = positional;
if (!corpus || !scenario || (si >= 0 && !showList)) {
  console.error("usage: node pilot/scenario.mjs <corpus> <scenario.dl> [--show pred,pred,...]");
  process.exit(2);
}

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.name.endsWith(".dl")) out.push(p);
  }
  return out.sort();
}

const rules = [];
const dir = resolve(corpus, "formal");
for (const p of await walk(dir)) {
  const text = await readFile(p, "utf8");
  const id = (/^%\s*formalizes:\s*(\S+)/m.exec(text) || [])[1] || relative(dir, p);
  for (const r of parseProgram(text)) {
    if (r.head.pred === "bottom") r.head = { kind: "atom", pred: "violation", args: [{ const: id }], neg: false };
    rules.push(r);
  }
}

const facts = {};
for (const r of parseProgram(await readFile(scenario, "utf8"))) {
  if (r.body.length) { console.error(`${scenario}: line ${r.line} is a rule; a scenario holds facts only`); process.exit(2); }
  (facts[r.head.pred] ||= []).push(r.head.args.map((t) => t.const));
}

const db = evaluate(rules, facts);
const SHOW = showList ? showList.split(",") : [...new Set(rules.map((r) => r.head.pred))].filter((p) => p !== "violation").sort();
const show = (t) => t.map((x) => (typeof x === "string" ? x : String(x))).join(", ");
const violations = db.get("violation") || [];
console.log(violations.length ? `${violations.length} rule(s) broken:` : "no rule broken.");
for (const [id] of violations) console.log(`  ${id}`);
for (const p of SHOW) {
  const tuples = db.get(p) || [];
  if (tuples.length) console.log(`${p}: ${tuples.map((t) => `(${show(t)})`).join(" ")}`);
}
