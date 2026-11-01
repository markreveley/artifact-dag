#!/usr/bin/env node
// Build glossaries from the definition nodes of a DAG, which are the single
// source of truth:
//   - an optional master glossary of every term (config "master");
//   - the "## Glossary" section of each document in config "docs", holding the
//     terms tagged with that document's tag, plus any definition from an
//     external DAG (config "external") that the document's claims use.
//
//   node bin/dag-to-glossary.js --config <repo>/glossary.config.json [--check]
//
// Paths in the config are relative to the config file's directory; "~" at the
// start of an external path is the home directory. An external DAG that is not
// found is skipped with a warning.
//
//   { "dag": "dag",
//     "master": "glossary/glossary.md",
//     "external": ["~/dev/repos/identikey/identikey-dev/dag"],
//     "script_label": "scripts/dag-to-glossary.mjs",   (how the master glossary names its builder)
//     "docs": [["doc-tutorial", "Title", "tutorials/tutorial.md"], ...] }
//
// With --check nothing is written; the exit code is 1 if any glossary would
// change. Wikilinks in a definition become links to that term's heading when
// the term is in the same glossary, and plain text otherwise. A document whose
// claims are in the DAG gets "Introduced in section …" from the first section
// whose claims use the term.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";

const argv = process.argv.slice(2);
const check = argv.includes("--check");
const ci = argv.indexOf("--config");
if (ci < 0 || !argv[ci + 1]) {
  console.error("usage: dag-to-glossary.js --config <glossary.config.json> [--check]");
  process.exit(2);
}
const configPath = resolve(argv[ci + 1]);
const base = dirname(configPath);
const config = JSON.parse(await readFile(configPath, "utf8"));
const at = (p) => (p.startsWith("~/") ? join(homedir(), p.slice(2)) : resolve(base, p));

// Documents in the order the master glossary lists them, keyed by tag.
const DOCS = config.docs;
const docByTag = new Map(DOCS.map(([tag, title, path], i) => [tag, { title, path, i }]));

// Just enough of the artifact-dag frontmatter subset for these files.
function readNode(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]"))
      v = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    else if (/^".*"$/.test(v)) v = JSON.parse(v);
    fm[kv[1]] = v;
  }
  const [value, ...sections] = text.slice(m[0].length).split(/^## /m);
  const subs = [];
  const sub = sections.find((s) => /^sub-?definitions\s*$/im.test(s.split("\n")[0]));
  if (sub) for (const part of sub.split(/^### /m).slice(1)) {
    const [head, ...rest] = part.split("\n");
    subs.push({ source: head.trim(), text: rest.join("\n").trim() });
  }
  return { ...fm, tags: fm.tags || [], uses: fm.uses || [], value: value.trim(), subs };
}

async function readDir(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await readDir(p)));
    else if (e.name.endsWith(".md") && e.name !== "README.md") {
      const n = readNode(await readFile(p, "utf8"));
      if (n) out.push(n);
    }
  }
  return out;
}
const all = await readDir(at(config.dag || "dag"));
const defs = all.filter((n) => n.type === "definition");
const claims = all.filter((n) => n.type === "claim");

// External DAGs: their definitions can appear in a document's glossary when
// the document's claims use them. Ids are global, so a local node wins.
const localIds = new Set(defs.map((d) => d.id));
const external = [];
for (const p of config.external || []) {
  try { await stat(at(p)); } catch { console.error(`external DAG not found, skipped: ${p}`); continue; }
  for (const n of await readDir(at(p)))
    if (n.type === "definition" && !localIds.has(n.id) && !external.some((x) => x.id === n.id)) external.push(n);
}

// Alphabetical, ignoring case and leading punctuation (".env file", "_do").
const key = (t) => t.toLowerCase().replace(/^[^a-z0-9]+/, "");
const byTitle = (a, b) => (key(a.title) < key(b.title) ? -1 : key(a.title) > key(b.title) ? 1 : 0);
defs.sort(byTitle);
const allDefs = [...defs, ...external];
const letter = (t) => key(t)[0].toUpperCase();
const slug = (h) => h.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");

function body(n, inGlossary) {
  const link = (text) => text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
    const target = allDefs.find((d) => d.id === id);
    const shown = label || target?.title || id;
    return target && inGlossary.has(id) ? `[${shown}](#${slug(target.title)})` : shown;
  });
  return [link(n.value), ...n.subs.map((s) => `**${s.source}:** ${link(s.text)}`)];
}

const docClaims = (docPath) => claims.filter((c) => c.document && c.document.endsWith("/" + docPath))
  .sort((a, b) => Number(a.order) - Number(b.order));

// "Introduced in" for a document decomposed into claims: the first section,
// in reading order, whose claims use the term.
function introducedIn(docPath, docText) {
  const first = new Map();
  for (const c of docClaims(docPath)) for (const u of c.uses) if (!first.has(u)) first.set(u, c.section);
  if (!first.size) return null;
  const headings = new Set(docText.match(/^#{2,3} .+$/gm).map((h) => h.replace(/^#+ /, "")));
  return (id) => {
    const sec = first.get(id);
    if (!sec || !headings.has(sec)) return "";
    const label = /^(\d+)\./.exec(sec)?.[1] || sec.replace(/\..*$/, "");
    return ` *Introduced in section [${label}](#${slug(sec)}).*`;
  };
}

const outputs = [];

// Master glossary.
if (config.master) {
  const ids = new Set(defs.map((d) => d.id));
  const docsUsed = DOCS.filter(([tag]) => defs.some((n) => n.tags.includes(tag)));
  const letters = [...new Set(defs.map((n) => letter(n.title)))];
  const lines = [
    "# Glossary", "",
    `**Covers:** every technical term in the ${docsUsed.length} documents in this repository (${defs.length} terms). Each entry lists the documents it appears in. Built from \`dag/definitions/\` by \`${config.script_label || "bin/dag-to-glossary.js"}\`; edit the definition files, not this one.`, "",
    `**Documents:** ${docsUsed.map(([, t, p]) => `${t} (\`${p}\`)`).join("; ")}.`, "",
    `**Jump to:** ${letters.map((L) => `[${L}](#${L.toLowerCase()})`).join(" · ")}`, "",
  ];
  for (const L of letters) {
    lines.push("", `## ${L}`, "");
    for (const n of defs.filter((n) => letter(n.title) === L)) {
      const docs = n.tags.map((t) => docByTag.get(t)).filter(Boolean).sort((a, b) => a.i - b.i);
      lines.push(`### ${n.title}`, "", ...body(n, ids).flatMap((p) => [p, ""]));
      if (docs.length) lines.push(`*Appears in:* ${docs.map((d) => d.title).join("; ")}.`, "");
    }
  }
  outputs.push([config.master, lines.join("\n").replace(/\n+$/, "\n")]);
}

// Each document's own glossary section, between "## Glossary" and the next
// "---" rule or "## " heading. The intro paragraph is kept as written.
for (const [tag, , path] of DOCS) {
  let text;
  try { text = await readFile(at(path), "utf8"); } catch { continue; }
  const start = text.search(/^## Glossary[ \t]*$/m);
  if (start < 0) continue;
  const after = text.slice(start).split("\n");
  let end = after.findIndex((l, i) => i > 0 && (/^---\s*$/.test(l) || /^## /.test(l)));
  if (end < 0) end = after.length;
  const region = after.slice(0, end).join("\n");
  const nested = /^#### /m.test(region); // entries under letter headings
  const intro = region.split("\n").slice(1).join("\n").split(/^#{3,4} |^\*\*Jump to:\*\*/m)[0].trim();
  const used = new Set(docClaims(path).flatMap((c) => c.uses));
  const mine = [...defs.filter((d) => d.tags.includes(tag)),
                ...external.filter((d) => d.tags.includes(tag) || used.has(d.id))];
  if (external.length) mine.sort(byTitle);
  const ids = new Set(mine.map((d) => d.id));
  const intro_in = introducedIn(path, text) || (() => "");
  const lines = ["## Glossary", ""];
  if (intro) lines.push(intro, "");
  const entry = (n, h) => {
    const paras = body(n, ids);
    paras[paras.length - 1] += intro_in(n.id);
    lines.push(`${h} ${n.title}`, "", ...paras.flatMap((p) => [p, ""]));
  };
  if (nested) {
    const letters = [...new Set(mine.map((n) => letter(n.title)))];
    lines.push(`**Jump to:** ${letters.map((L) => `[${L}](#${L.toLowerCase()})`).join(" · ")}`, "");
    for (const L of letters) {
      lines.push(`### ${L}`, "");
      for (const n of mine.filter((n) => letter(n.title) === L)) entry(n, "####");
      lines.push("");
    }
  } else for (const n of mine) entry(n, "###");
  const rest = after.slice(end).join("\n");
  const next = text.slice(0, start) + lines.join("\n").replace(/\n+$/, "\n") + (rest ? "\n" + rest : "");
  outputs.push([path, next]);
}

let changed = 0;
for (const [path, next] of outputs) {
  let prev = "";
  try { prev = await readFile(at(path), "utf8"); } catch {}
  if (prev === next) continue;
  changed++;
  if (check) console.error(`out of date: ${path}`);
  else await writeFile(at(path), next);
}
const ext = external.length ? ` (+${external.length} external)` : "";
console.error(`${defs.length} definitions${ext}, ${outputs.length} glossaries, ${changed} ${check ? "out of date" : "rewritten"}`);
if (check && changed) process.exit(1);
