# The reference pilot's `def-member.dl` makes two predicates synonyms

| | |
|---|---|
| Found by | [the second audit](../audits/2026-11-02-second-adversarial-audit.md), at `35661d4` |
| Rechecked | 2026-11-05 at `67f437c`: still open |
| Tracker | not filed |

1. **`pilot/2026-11-02-registration-once/formal/def-member.dl`.**
   *Expected:* each predicate in a definition's formal file says something
   the others do not. *Observed:* `member(M) :- registered(M).` and
   `registered(M) :- member(M).`, so `member` and `registered` are one
   predicate under two names. *Status:* open. Step 2's line-by-line
   ratification of the predicate lines (`pilot/PROCEDURE.md`), which the
   reference pilot never had, is where it would be caught; the pilot's
   README says those lines were never ratified line by line.
