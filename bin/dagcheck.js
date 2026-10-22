#!/usr/bin/env node
// Parse a folder of nodes and report problems. Exit 1 on any error.
//   dagcheck <folder>                    human readable report
//   dagcheck <folder> --json             the parsed graph as JSON
//   dagcheck <folder> --lint             also run the lint rules
//   dagcheck <folder> --lint --json      problems and findings as JSON
//   dagcheck <folder> --lint --baseline <file>
//                                        report only warn and info findings
//                                        not in <file>; writes <file> with the
//                                        current ones when it does not exist
//
// Lint rules are lint/rules.dl, then <folder>/lint.dl when present.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCollection } from "../src/parse.js";
import { lint, findingKey } from "../src/lint.js";

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.isFile() && ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const [root, ...flags] = process.argv.slice(2);
const bi = flags.indexOf("--baseline");
const baselinePath = bi >= 0 ? flags[bi + 1] : null;
if (!root || (bi >= 0 && !baselinePath)) {
  console.error("usage: dagcheck <folder> [--json] [--lint [--baseline <file>]]");
  process.exit(2);
}
const json = flags.includes("--json");
const linting = flags.includes("--lint");
const paths = await walk(root);
const files = await Promise.all(
  paths.map(async (p) => ({ path: relative(root, p), text: await readFile(p, "utf8") })),
);
const graph = parseCollection(files);

let findings = [];
let baselined = 0;
if (linting) {
  const here = dirname(fileURLToPath(import.meta.url));
  let rules = await readFile(join(here, "../lint/rules.dl"), "utf8");
  const local = await readFile(join(root, "lint.dl"), "utf8").catch(() => null);
  if (local != null) rules += "\n" + local;
  findings = lint(graph, rules);
  if (baselinePath) {
    const old = await readFile(baselinePath, "utf8").then(JSON.parse).catch(() => null);
    if (old == null) {
      const keys = findings.filter((f) => f.level !== "error").map(findingKey).sort();
      await writeFile(baselinePath, JSON.stringify(keys, null, 2) + "\n");
      console.error(`wrote baseline ${baselinePath} (${keys.length} findings)`);
    }
    const known = new Set(old || findings.filter((f) => f.level !== "error").map(findingKey));
    const kept = findings.filter((f) => f.level === "error" || !known.has(findingKey(f)));
    baselined = findings.length - kept.length;
    findings = kept;
  }
}

if (json && linting) {
  console.log(JSON.stringify({ problems: graph.problems, findings }, null, 2));
} else if (json) {
  console.log(JSON.stringify(graph, null, 2));
} else {
  const byType = {};
  for (const n of graph.nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  console.log(`${graph.nodes.length} nodes (${Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(", ")}), ` +
    `${graph.edges.length} edges, ${graph.external.length} external`);
  for (const p of graph.problems) {
    console.log(`${p.level.padEnd(5)} ${p.code.padEnd(16)} ${p.path ? p.path + ": " : ""}${p.message}`);
  }
  if (linting) {
    const count = {};
    for (const f of findings) count[f.level] = (count[f.level] || 0) + 1;
    console.log(`lint: ${["error", "warn", "info"].map((l) => `${count[l] || 0} ${l}`).join(", ")}` +
      (baselined ? ` (${baselined} in baseline)` : ""));
    for (const f of findings) {
      console.log(`${f.level.padEnd(5)} ${f.code.padEnd(19)} ${f.path ? f.path + ": " : ""}${f.message}`);
    }
  }
}
const failed = graph.problems.some((p) => p.level === "error") || findings.some((f) => f.level === "error");
process.exit(failed ? 1 : 0);
