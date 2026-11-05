# The viewer loads dagre from a CDN with no integrity hash

| | |
|---|---|
| Found by | [the second audit](../audits/2026-11-02-second-adversarial-audit.md), at `35661d4` |
| Rechecked | 2026-11-05 at `67f437c`: still open |
| Tracker | not filed |

1. **`viewer/template.html:203`.** *Expected:* a third-party script on a
   page that embeds every node carries `integrity` and `crossorigin`, or is
   not third-party. *Observed:* `<script
   src="https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js">`
   with neither, so a compromised CDN reads every node of a published page.
   *Status:* open. Left by the audit on purpose: vendoring dagre into the
   page (`next-agents.md`, the optional step) closes it and also lets a
   page lay out offline.
