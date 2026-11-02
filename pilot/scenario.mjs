#!/usr/bin/env node
// Run a corpus's formal text as one program over a scenario of facts, and
// report which rules it breaks and what it derives. The other use of formal
// nodes: not checking an argument, but running the norms.
//   node pilot/scenario.mjs <corpus> <scenario.dl> [--show pred,pred,...]
// Every "bottom :- B." becomes violation(<node id>) :- B., so a broken rule
// names the claim that states it. The scenario file holds facts only.

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseProgram, evaluate } from "../src/datalog.js";

const argv = process.argv.slice(2);
const [corpus, scenario] = argv.filter((a) => !a.startsWith("--"));
if (!corpus || !scenario) {
  console.error("usage: node pilot/scenario.mjs <corpus> <scenario.dl> [--show pred,pred,...]");
  process.exit(2);
}
const showArg = argv.find((a) => a.startsWith("--show="));
const SHOW = showArg ? showArg.slice(7).split(",") : ["overdue", "fine_accrues", "owes", "may_borrow", "may_place_hold", "may_lend", "set_aside", "lapsed", "declared_lost", "owes_replacement"];

const rules = [];
const dir = resolve(corpus, "formal");
for (const name of (await readdir(dir)).filter((n) => n.endsWith(".dl")).sort()) {
  const text = await readFile(join(dir, name), "utf8");
  const id = (/^%\s*formalizes:\s*(\S+)/m.exec(text) || [])[1] || name;
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
const show = (t) => t.map((x) => (typeof x === "string" ? x : String(x))).join(", ");
const violations = db.get("violation") || [];
console.log(violations.length ? `${violations.length} rule(s) broken:` : "no rule broken.");
for (const [id] of violations) console.log(`  ${id}`);
for (const p of SHOW) {
  const tuples = db.get(p) || [];
  if (tuples.length) console.log(`${p}: ${tuples.map((t) => `(${show(t)})`).join(" ")}`);
}
