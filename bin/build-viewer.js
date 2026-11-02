#!/usr/bin/env node
// Build the viewer page for one or more folders of nodes.
//   build-viewer --dag <folder> [--dag <folder> ...] [--title "Name"] > viewer.html
//   build-viewer --config dag-viewer/config.json > viewer.html
// The page inlines the nodes as they are now, so it needs no server: open it
// as a file or put it on any static host, and rebuild it after editing.
// Several folders become one graph joined on ids. Each is labelled with the
// name of the directory that holds it (identikey-dev/dag: "identikey-dev").
// The config file holds {"dag": <entry> or [<entry>, ...], "title": "Name"},
// where an entry is a path or {"path": ..., "name": ...}; paths are relative
// to the config file. Flags override it.

import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const here = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : undefined; };
const flags = (name) => args.flatMap((a, i) => (a === "--" + name && i + 1 < args.length ? [args[i + 1]] : []));
const configPath = flag("config");
const file = configPath ? JSON.parse(await readFile(configPath, "utf8")) : {};

const entry = (e, base) => {
  const path = resolve(base, typeof e === "string" ? e : e.path);
  return { path, name: (typeof e === "object" && e.name) || basename(dirname(path)) };
};
const folders = flags("dag").length
  ? flags("dag").map((p) => entry(p, "."))
  : [file.dag ?? []].flat().map((e) => entry(e, dirname(configPath)));
if (!folders.length) {
  console.error('usage: build-viewer (--dag <folder> [--dag <folder> ...] | --config file.json) [--title "Name"]');
  process.exit(2);
}
const title = flag("title") ?? file.title ?? "Definitions and claims";

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
const slugs = new Set();
const sources = [];
for (const { path, name } of folders) {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dag";
  while (slugs.has(slug)) slug += "-2";
  slugs.add(slug);
  const files = await Promise.all((await walk(path)).sort().map(async (p) =>
    ({ path: relative(path, p).split(/[\\/]/).join("/"), text: await readFile(p, "utf8") })));
  sources.push({ slug, name, files });
}

// `</script` inside JSON would end the inline script early.
const json = (v) => JSON.stringify(v).replace(/<\//g, "<\\/");

const html = (await readFile(join(here, "viewer/template.html"), "utf8"))
  .replace(/__TITLE__/g, title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])))
  .replace("/*__PARSER__*/", () => parser)
  .replace("__SOURCES__", () => json(sources));
process.stdout.write(html);
