// Minimal frontmatter reader. Handles the YAML subset documented in md/governance/SCHEMA.md
// and nothing more, so it can ship inside the viewer page with no deps.

const LIST_KEYS = new Set([
  "aliases", "tags", "sources", "not_links",
  "uses", "depends_on", "supports", "contradicts", "refines", "topics",
]);

export function splitFrontmatter(text) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { front: null, body: text };
  return { front: m[1], body: text.slice(m[0].length) };
}

// A quote opens a quoted string only where a value starts: after the key's
// colon, a list's bracket or comma, or a list item's dash. An apostrophe
// inside a word ("Spinoza's") is text.
const OPENS_QUOTE = new Set(["", ":", "[", ",", "-"]);

function stripComment(s) {
  let q = null, prev = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if ((c === '"' || c === "'") && OPENS_QUOTE.has(prev)) q = c;
    else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
    if (!/\s/.test(c)) prev = c;
  }
  return s;
}

function scalar(raw) {
  const s = raw.trim();
  if (s === "") return "";
  const q = s[0];
  if ((q === '"' || q === "'") && s.endsWith(q) && s.length >= 2) {
    const inner = s.slice(1, -1);
    return q === '"' ? inner.replace(/\\(["\\])/g, "$1") : inner;
  }
  return s;
}

function flowList(s) {
  const out = [];
  let cur = "", q = null;
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; }
    else if ((c === '"' || c === "'") && cur.trim() === "") { q = c; cur += c; }
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map(scalar).filter((v) => v !== "");
}

// `onBadLine`, when given, is called with each line that is neither
// `key: value` nor a list item under a key (a nested mapping, say).
export function parseFrontmatter(front, onBadLine) {
  const data = {};
  if (front == null) return data;
  const lines = front.split(/\r?\n/);
  let listKey = null;
  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (line.trim() === "") continue;
    const item = /^\s*-\s*(.*)$/.exec(line);
    if (item) {
      if (listKey) data[listKey].push(scalar(item[1]));
      else onBadLine?.(rawLine.trim());
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) { onBadLine?.(rawLine.trim()); continue; }
    const [, key, rest] = kv;
    const v = rest.trim();
    if (v === "") {
      // either an empty value or the start of a block list
      data[key] = [];
      listKey = key;
      continue;
    }
    listKey = null;
    if (v.startsWith("[") && v.endsWith("]")) data[key] = flowList(v.slice(1, -1));
    else data[key] = scalar(v);
  }
  // Keys the schema defines as lists are always lists, even when a single
  // scalar was written. An empty block list stays an empty list.
  for (const k of LIST_KEYS) {
    if (k in data && !Array.isArray(data[k])) data[k] = [data[k]];
  }
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k]) && data[k].length === 0 && !LIST_KEYS.has(k)) data[k] = "";
  }
  return data;
}
