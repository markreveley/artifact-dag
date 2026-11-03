// The viewer's Markdown: paragraphs, wikilinks, bold, italic and code spans;
// everything else is literal text. Pure, no DOM: returns an HTML string.
// `lookup(id)` returns the node a wikilink names ({type, title}) or null.
// Every piece of text is escaped, a linked node's title included.

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function renderMarkdown(text, lookup) {
  return text.split(/\n{2,}/).map((para) => {
    let h = escapeHtml(para.trim());
    // Wikilinks are matched in escaped text, so the id and label are escaped
    // already; the title comes from another node and is escaped here.
    h = h.replace(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (m, id, label) => {
      const n = lookup(id.trim());
      const cls = n ? `ref ${n.type}` : "ref external";
      return `<a class="${cls}" data-ref="${id.trim()}">${label || (n && escapeHtml(n.title)) || id}</a>`;
    });
    h = h.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return `<p>${h.replace(/\n/g, " ")}</p>`;
  }).join("");
}
