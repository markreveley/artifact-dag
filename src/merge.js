// Join several collections into one graph. Pure: takes
// `[{slug, files: [{path, text}]}]`, returns what parseCollection returns, with
// each node's `project` set. Runs in Node and, inlined, in the viewer.
//
// Each folder is parsed on its own, then joined on id: the first definition of
// an id wins (folders in the order given), and a later one is noted as
// `shared` and left out, edges included. Externals and cycles are recomputed
// over the joined graph, so a link that is external in one project resolves
// when another project defines it.

import { parseCollection, findCycles } from "./parse.js";

export function mergeSources(sources) {
  const nodes = [], edges = [], problems = [];
  const byId = new Map();
  const seen = new Set();
  for (const s of sources) {
    const g = parseCollection(s.files.map((f) => ({ path: `${s.slug}/${f.path}`, text: f.text })));
    for (const p of g.problems) if (p.code !== "external" && p.code !== "cycle") problems.push(p);
    const hidden = new Set();
    for (const n of g.nodes) {
      n.project = s.slug;
      const first = byId.get(n.id);
      if (first) {
        (first.alsoIn ||= []).push(s.slug);
        hidden.add(n.id);
        problems.push({ level: "info", code: "shared", path: n.path,
          message: `"${n.id}" is also defined in ${first.project}; showing ${first.project}'s version` });
        continue;
      }
      byId.set(n.id, n);
      nodes.push(n);
    }
    for (const e of g.edges) {
      if (hidden.has(e.from)) continue;
      const k = `${e.from}\u0000${e.kind}\u0000${e.to}`;
      if (!seen.has(k)) { seen.add(k); edges.push(e); }
    }
  }
  const external = [...new Set(edges.map((e) => e.to).filter((id) => !byId.has(id)))].sort();
  for (const id of external) problems.push({ level: "info", code: "external", path: "", message: `"${id}" is linked but defined in no project here` });
  for (const cycle of findCycles(byId.keys(), edges)) {
    problems.push({ level: "error", code: "cycle", path: byId.get(cycle[0]).path, message: `cycle: ${[...cycle, cycle[0]].join(" -> ")}` });
  }
  return { nodes, edges, problems, external };
}
