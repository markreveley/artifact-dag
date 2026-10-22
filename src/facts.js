// Turn a parsed collection into Datalog facts for the linter. Pure, no
// dependencies. String matching happens here, because Datalog has none:
//
//   node(Id, Type)              every node
//   tag(Id, Tag)                every tag
//   doc_tag(Id, Tag)            tags that start with "doc-"
//   edge(From, To, Kind)        every edge, including mentions and about
//   in_doc(Id, Doc, Order)      nodes with a document and an order
//   names(Id, Term, Word)       Id's value names definition Term, outside wikilinks
//   title_contains(Id, Term, Where)
//                               definition Id's title contains Term's title;
//                               Where is "end", "start" or "inside"
//   not_link(Id, Term)          the node's not_links field

const WIKILINK_RE = /\[\[[^\]]*\]\]/g;
const MD_LINK_TARGET_RE = /\]\([^)]*\)/g;
const CODE_RE = /`[^`]*`/g;
const PAREN_RE = /^(.*?)\s*\(([^)]*)\)\s*$/;

const fold = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A short form only counts when written in capitals ("XID", "OP", "C2"), and
// then only in capitals.
function isUpper(s) {
  return /\p{L}/u.test(s) && s === s.toUpperCase();
}

// The surface forms each definition can be named by: its title, its title
// without a trailing parenthetical when that is unambiguous, and its aliases.
// Returns [{ id, form, re }].
export function termForms(nodes) {
  const defs = nodes.filter((n) => n.type === "definition" && n.id);
  const titles = new Map(); // folded title -> count
  const bump = (k) => titles.set(k, (titles.get(k) || 0) + 1);
  for (const d of defs) {
    bump(fold(d.title));
    const m = PAREN_RE.exec(d.title);
    if (m && m[1]) bump(fold(m[1]));
  }
  const out = [];
  for (const d of defs) {
    const forms = new Set([d.title, ...d.aliases]);
    const m = PAREN_RE.exec(d.title);
    if (m && m[1] && titles.get(fold(m[1])) === 1) forms.add(m[1]);
    for (const form of forms) {
      const f = form.trim();
      if (!f) continue;
      const upper = isUpper(f);
      if (f.length <= 3 && !upper) continue;
      const body = escape(f).replace(/\s+/g, "\\s+");
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:s|es)?(?![\\p{L}\\p{N}])`,
        upper && f.length <= 3 ? "gu" : "giu");
      out.push({ id: d.id, form: f, re });
    }
  }
  return out;
}

// Text a node names terms in: its value, minus wikilinks, Markdown link
// targets and code spans (each replaced by spaces so offsets stay put).
export function scanText(node) {
  const blank = (m) => " ".repeat(m.length);
  return node.value.replace(WIKILINK_RE, blank).replace(MD_LINK_TARGET_RE, blank).replace(CODE_RE, blank);
}

// Every term named in `text`, longest match first, no two overlapping, so
// "access token" names Access token and not also Token.
// Returns [{ id, word, start, end }] in text order.
export function findTerms(text, forms) {
  const hits = [];
  for (const { id, re } of forms) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) hits.push({ id, word: m[0], start: m.index, end: m.index + m[0].length });
  }
  hits.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start || (a.id < b.id ? -1 : 1));
  const taken = [];
  const out = [];
  for (const h of hits) {
    if (taken.some((t) => h.start < t.end && t.start < h.end && t.id !== h.id)) continue;
    if (out.some((o) => o.id === h.id && o.start === h.start)) continue;
    taken.push(h);
    out.push(h);
  }
  return out.sort((a, b) => a.start - b.start);
}

export function toFacts(graph) {
  const f = { node: [], tag: [], doc_tag: [], edge: [], in_doc: [], names: [], title_contains: [], not_link: [] };
  const forms = termForms(graph.nodes);
  const seen = new Set();
  const once = (rel, tuple) => {
    const k = rel + JSON.stringify(tuple);
    if (!seen.has(k)) { seen.add(k); f[rel].push(tuple); }
  };

  for (const n of graph.nodes) {
    if (!n.id) continue;
    once("node", [n.id, n.type]);
    for (const t of n.tags) {
      once("tag", [n.id, t]);
      if (t.startsWith("doc-")) once("doc_tag", [n.id, t]);
    }
    if (n.document && n.order != null) once("in_doc", [n.id, n.document, n.order]);
    for (const t of n.notLinks || []) once("not_link", [n.id, t]);

    for (const h of findTerms(scanText(n), forms)) {
      if (h.id !== n.id) once("names", [n.id, h.id, h.word]);
    }

    if (n.type === "definition") {
      const title = (PAREN_RE.exec(n.title)?.[1] || n.title).trim();
      for (const { id, re } of forms) {
        if (id === n.id) continue;
        re.lastIndex = 0;
        for (const m of title.matchAll(re)) {
          if (m[0].length === title.length) continue; // same name, not a narrower one
          const where = m.index + m[0].length === title.length ? "end" : m.index === 0 ? "start" : "inside";
          once("title_contains", [n.id, id, where]);
        }
      }
    }
  }
  for (const e of graph.edges) once("edge", [e.from, e.to, e.kind]);
  return f;
}
