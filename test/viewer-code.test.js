// The viewer's own code, which build-viewer inlines into the page: joining
// several collections, and rendering Markdown.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSources } from "../src/merge.js";
import { renderMarkdown, escapeHtml } from "../src/markdown.js";

const node = (id, type, extra = "") => ({ path: `${id.split(":")[1]}.md`, text: `---\nid: ${id}\ntype: ${type}\ntitle: ${id}\n${extra}---\nBody.` });

test("merge: the first project's version wins, and the later one's edges are left out", () => {
  const g = mergeSources([
    { slug: "one", files: [node("def:a", "definition", "uses: [def:b]\n"), node("def:b", "definition")] },
    { slug: "two", files: [node("def:a", "definition", "uses: [def:c]\n"), node("def:c", "definition")] },
  ]);
  assert.deepEqual(g.nodes.map((n) => `${n.id}@${n.project}`), ["def:a@one", "def:b@one", "def:c@two"]);
  assert.deepEqual(g.edges.map((e) => `${e.from}>${e.to}`), ["def:a>def:b"]);
  assert.deepEqual(g.nodes[0].alsoIn, ["two"]);
  assert.deepEqual(g.problems.map((p) => p.code), ["shared"]);
});

test("merge: a link external to one project resolves when another defines it", () => {
  const g = mergeSources([
    { slug: "one", files: [node("claim:x", "claim", "uses: [def:far, def:nowhere]\n")] },
    { slug: "two", files: [node("def:far", "definition")] },
  ]);
  assert.deepEqual(g.external, ["def:nowhere"]);
  assert.deepEqual(g.problems.filter((p) => p.code === "external").map((p) => p.message), ['"def:nowhere" is linked but defined in no project here']);
});

test("merge: cycles are found across projects", () => {
  const g = mergeSources([
    { slug: "one", files: [node("def:a", "definition", "uses: [def:b]\n")] },
    { slug: "two", files: [node("def:b", "definition", "uses: [def:a]\n")] },
  ]);
  assert.deepEqual(g.problems.map((p) => p.code), ["cycle"]);
});

test("markdown: a linked node's title is escaped like everything else", () => {
  const lookup = (id) => (id === "def:x" ? { type: "definition", title: '<img src=x onerror="alert(1)">' } : null);
  const html = renderMarkdown("See [[def:x]], [[def:y|a <b>label</b>]] and <script>.", lookup);
  assert.ok(!/<img|<script|<b>/.test(html), html);
  assert.match(html, /<a class="ref definition" data-ref="def:x">&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;<\/a>/);
  assert.match(html, /<a class="ref external" data-ref="def:y">a &lt;b&gt;label&lt;\/b&gt;<\/a>/);
});

test("markdown: paragraphs, code, bold and italic", () => {
  assert.equal(renderMarkdown("One *a* **b**\nline.\n\n`c`", () => null), "<p>One <em>a</em> <strong>b</strong> line.</p><p><code>c</code></p>");
  assert.equal(escapeHtml(`&<>"`), "&amp;&lt;&gt;&quot;");
});
