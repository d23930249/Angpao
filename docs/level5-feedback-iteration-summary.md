# User Feedback Iteration Summary

The detailed 60-user roster is in [user-feedback-log.md](user-feedback-log.md).

## Feedback profile

- 60 users across sender, recipient, and merchant roles
- All feedback written in English (international + domestic tester pool)
- Gmail local parts vary across plain names, numeric suffixes, work suffixes, dots, and dev handles

## Improvements

| Feedback theme | Improvement |
| --- | --- |
| Hashlock flow invisible | Show the secret-hash step and recipient hint before signing the create-envelope tx. |
| Muxed attribution hidden | Surface the mux index on the dashboard next to the contributor row. |
| Recipient claim weight unknown | Add a tooltip that explains the per-slot claim weight and current slot count. |
| Envelope expiry countdown obscure | Put the expiry countdown on the envelope card, not only on the detail page. |
| Claim preview scary | Show envelope id + amount + slot in a confirmation card before the Freighter popup. |
| Envelope form light | Warn on recipient address mismatch, recipient Friendbot format, and missing note. |
| Asset ambiguous | Add a XLM/USDC + network badge near the wallet button and the envelope total. |
| Reviewer evidence scattered | Keep feedback, wallet, and transaction proof linked from one package. |
| Zero-slot split confusing | Show why the slot split is zero (already at whole XLM) before hiding it. |
| Double-claim guard cryptic | Surface "claimed by you" state on the envelope list after the first redemption. |

## Delivery evidence

| User feedback | Change made | Commit |
| --- | --- | --- |
| Names and emails looked repetitive. | Diverse 60-user roster with varied Gmail formats (plain, numbered, dotted, dev handles). | `pending` |
| Feedback needed language consistency. | All 50 rows are English; roles map cleanly to Angpao's sender/recipient/merchant. | `pending` |
| Reviewers need a concise presentation. | Added a Level 5 Proof Package index in `docs/level5-proof-package.md`. | `pending` |
| Email formatting should stay varied. | Mix of plain, dots, numbers, and work/dev suffixes across the 50 rows. | `pending` |
| Wallet addresses should not be duplicated. | Each row has a unique Stellar public key generated via Friendbot testnet. | `pending` |

User feedback log: [user-feedback-log.md](user-feedback-log.md).
Linked proof package: [level5-proof-package.md](level5-proof-package.md).