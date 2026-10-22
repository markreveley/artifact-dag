#!/usr/bin/env node
// Build one instance of the viewer for one project.
//   build-viewer --project chan_... [--root dag] [--title "Name"] > viewer.html
// Inlines src/ into viewer/template.html along with the example collection,
// which the page shows whenever the project's files can't be read.

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const here = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : dflt; };

const project = opt("project");
if (!project) {
  console.error('usage: build-viewer --project chan_... [--root dag] [--title "Name"]');
  process.exit(2);
}
const config = { project, root: opt("root", "dag") };
const title = opt("title", "Definitions and claims");

// ESM modules become one inline script: drop imports, strip `export`.
const inline = (src) => src.replace(/^import .*$/gm, "").replace(/^export /gm, "");
const parser = [
  inline(await readFile(join(here, "src/frontmatter.js"), "utf8")),
  inline(await readFile(join(here, "src/parse.js"), "utf8")),
].join("\n");

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.name.endsWith(".md") && ent.name !== "README.md") out.push(p);
  }
  return out;
}
const exRoot = join(here, "examples/dag");
const sample = await Promise.all((await walk(exRoot)).map(async (p) =>
  ({ path: join(config.root, relative(exRoot, p)), text: await readFile(p, "utf8") })));

// `</script` inside JSON would end the inline script early.
const json = (v) => JSON.stringify(v).replace(/<\//g, "<\\/");

const html = (await readFile(join(here, "viewer/template.html"), "utf8"))
  .replace(/__TITLE__/g, title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])))
  .replace("/*__PARSER__*/", () => parser)
  .replace("__CONFIG__", () => json(config))
  .replace("__SAMPLE__", () => json(sample));
process.stdout.write(html);
