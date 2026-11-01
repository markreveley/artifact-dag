# Widget and diagram contract

The site is static HTML/CSS/JS with no build step for viewing. Pages are generated from the tutorial's Markdown source by `artifact-dag/tutorial/build.py`; figures are inserted at anchors. A tutorial's own widgets live in its `assets/widgets/`; widgets shared between tutorials live in `artifact-dag/tutorial/widgets/` and are copied in by the builder (config `shared_widgets`). Every interactive is one classic script in `assets/widgets/<name>.js`; every static diagram is one SVG file in `assets/diagrams/<name>.svg`, inlined into the page at build time.

## Widget API

```js
// assets/widgets/<name>.js  — classic script, no modules, no imports
(function () {
  window.IK = window.IK || {}; IK.widgets = IK.widgets || {};
  IK.widgets['<name>'] = function (root, opts) {
    // root: a <div class="ik-body"> inside <figure class="ik-figure" data-widget="<name>">
    // opts: parsed from data-opts JSON on the figure (may be {})
    // Build the UI inside root. Return nothing.
  };
})();
```

- Wrap your markup in a `<div class="ik-widget">`. Use the primitives in `assets/style.css` (`.ik-row`, `.ik-stack`, `.ik-cols`, `.ik-panel`, `.ik-label`, `.ik-mono`, `.ik-input`, `.ik-textarea`, `.ik-select`, `.ik-btn` with `.is-secondary`/`.is-danger`, `.ik-chip` with `.is-good`/`.is-bad`/`.is-warm`, `.ik-changed`, `.ik-ok`, `.ik-fail`, `.ik-steps` with `.is-active`/`.is-done`, `.ik-help`). Any extra CSS you need goes in a `<style>` element you append once to `document.head`, scoped under a class unique to your widget, and uses only the CSS custom properties from `:root` (`--paper`, `--paper-2`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--accent`, `--accent-ink`, `--accent-soft`, `--warm`, `--warm-soft`, `--bad`, `--bad-soft`, `--good`, `--good-soft`, `--code-bg`, `--font-display`, `--font-body`, `--font-mono`). Never a literal color: the site has light and dark themes.
- Crypto comes from the global `IKCrypto` (loaded before widgets), bundled from noble libraries:
  - `IKCrypto.sha256(bytes) -> Uint8Array`, `IKCrypto.sha512(bytes)`, `IKCrypto.blake3(bytes) -> Uint8Array(32)`
  - `IKCrypto.hmac(IKCrypto.sha256, key, msg) -> Uint8Array`
  - `IKCrypto.hkdf(IKCrypto.sha256, ikm, salt, info, length) -> Uint8Array`
  - `IKCrypto.ed.utils.randomPrivateKey() -> Uint8Array(32)`, `IKCrypto.ed.getPublicKey(priv) -> Uint8Array(32)`, `IKCrypto.ed.sign(msg, priv) -> Uint8Array(64)`, `IKCrypto.ed.verify(sig, msg, pub) -> boolean` (all synchronous)
  - `IKCrypto.utf8ToBytes(str)`, `IKCrypto.bytesToUtf8(bytes)`, `IKCrypto.bytesToHex(bytes)`, `IKCrypto.hexToBytes(hex)`, `IKCrypto.randomBytes(n)`, `IKCrypto.base58(bytes)`, `IKCrypto.b64url(bytes)`, `IKCrypto.unb64url(str)`
- No network calls, no external scripts, no localStorage requirement (a per-viewer convenience wrapped in try/catch is fine). No `alert`/`confirm`/`prompt`.
- Must work at 360px width with no horizontal overflow (wrap or scroll inside your own container), be keyboard operable (real `<button>` and `<input>` elements, visible focus), label every control, and respect `prefers-reduced-motion` (check `matchMedia('(prefers-reduced-motion: reduce)').matches` before animating; animations must still reach their end state instantly when reduced).
- Opens in a working state: sensible default input already filled in, result already computed, so the first frame shows what the widget does without a click.
- Give every form control a stable `id` prefixed with the widget name.
- Plain, concrete microcopy; no emoji; no marketing. Explain outcomes in one short line (e.g. "Signature valid: the message is exactly what was signed, by the holder of this private key.").
- Keep it small: a widget is typically 150–350 lines. One idea per widget.

## Diagram contract

- One `<svg>` root, `viewBox` set, no fixed `width`/`height` attributes (CSS scales it), `role="img"` and an `<title>` as the first child.
- Colors only via `var(--token)` in `fill`/`stroke` attributes (e.g. `stroke="var(--ink-2)"`), and text via `font-family="var(--font-display)"`. Every shape has an explicit fill (use `var(--paper)` or `none`).
- Font sizes in the SVG in the range 12–14 user units when the viewBox is ~800 wide; leave margin inside the viewBox for the outermost labels; nothing overlaps.
- Arrows: define one `<marker>` and reuse it. Keep line weights 1.5–2.
- Legible when scaled to 360px wide: prefer a tall layout over a wide one when there are many steps.

## Captions and placement

`build.py` wraps each figure with `<figcaption>` from the placement map; you do not write captions. Each widget's job is described in that map, so match it.
