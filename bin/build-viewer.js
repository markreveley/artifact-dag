#!/usr/bin/env node
// Build one instance of the viewer for one project.
//   build-viewer --project chan_... [--root dag] [--title "Name"] > viewer.html
//   build-viewer --config dag-viewer/config.json > viewer.html
//   build-viewer --project chan_... --federation --slug dag --name "DAG" [--title ...]
//   build-viewer --dag path/to/dag [--title "Name"] > viewer.html
// --federation adds the bundles other projects pushed to the artifact's
// database (see bin/push-plan.js); --slug and --name label this project.
// --config reads the same options from a JSON file kept in the project's
// repo ({project, root, title, federation, slug, name, dag}); flags override it.
// --dag is local mode: the page shows that folder's nodes, inlined at build
// time, and needs no Claude project; open it as a file or serve it anywhere.
// A `dag` path in the config file is relative to the config file.
// Inlines src/ into viewer/template.html along with the example collection,
// which the page shows whenever the project's files can't be read.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const here = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : undefined; };
const file = flag("config") ? JSON.parse(await readFile(flag("config"), "utf8")) : {};
const opt = (name, dflt) => flag(name) ?? file[name] ?? dflt;

const dag = flag("dag") ?? (file.dag && resolve(dirname(flag("config")), file.dag));
const project = opt("project");
if (!project && !dag) {
  console.error('usage: build-viewer (--project chan_... [--root dag] | --dag <folder> | --config file.json) [--title "Name"]');
  process.exit(2);
}
const federation = !dag && (args.includes("--federation") || file.federation === true);
const config = { project: dag ? null : project, root: opt("root", "dag"), federation, local: Boolean(dag),
  slug: opt("slug", "this"), name: opt("name", "This project") };
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
// Paths take the form the project's files give them: `<root>/<relative>`.
const collect = async (dir) => Promise.all((await walk(dir)).sort().map(async (p) =>
  ({ path: [config.root, ...relative(dir, p).split(/[\\/]/)].join("/"), text: await readFile(p, "utf8") })));
const sample = await collect(join(here, "examples/dag"));
const local = dag ? await collect(dag) : null;

// `</script` inside JSON would end the inline script early.
const json = (v) => JSON.stringify(v).replace(/<\//g, "<\\/");

const html = (await readFile(join(here, "viewer/template.html"), "utf8"))
  .replace(/__TITLE__/g, title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])))
  .replace("/*__PARSER__*/", () => parser)
  .replace("__CONFIG__", () => json(config))
  .replace("__SAMPLE__", () => json(sample))
  .replace("__LOCAL__", () => json(local));
process.stdout.write(html);
