#!/usr/bin/env node
// Parse a folder of nodes and report problems. Exit 1 on any error.
//   dagcheck <folder>          human readable report
//   dagcheck <folder> --json   the parsed graph as JSON

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseCollection } from "../src/parse.js";

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
if (!root) {
  console.error("usage: dagcheck <folder> [--json]");
  process.exit(2);
}
const paths = await walk(root);
const files = await Promise.all(
  paths.map(async (p) => ({ path: relative(root, p), text: await readFile(p, "utf8") })),
);
const graph = parseCollection(files);

if (flags.includes("--json")) {
  console.log(JSON.stringify(graph, null, 2));
} else {
  const byType = {};
  for (const n of graph.nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  console.log(`${graph.nodes.length} nodes (${Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(", ")}), ` +
    `${graph.edges.length} edges, ${graph.external.length} external`);
  for (const p of graph.problems) {
    console.log(`${p.level.padEnd(5)} ${p.code.padEnd(16)} ${p.path ? p.path + ": " : ""}${p.message}`);
  }
}
process.exit(graph.problems.some((p) => p.level === "error") ? 1 : 0);
