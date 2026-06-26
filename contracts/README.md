# Angpao Escrow — Soroban smart contract

An **advanced Soroban (Rust) smart contract** that turns the Angpao gift-card app
from a custodial / Stellar-classic flow into a **trust-minimized, on-chain escrow**
for USDC red envelopes. It is self-contained under `contracts/` and does not touch
the Next.js app build.

## Capabilities

| Capability | What it does | Soroban concept demonstrated |
|---|---|---|
| **USDC token escrow** | Sender locks real USDC into the contract; the contract custodies and pays out | Cross-contract calls to the **Stellar Asset Contract (SAC)** `token` interface |
| **Hashlock (HTLC)** | A slot is claimable only by revealing `preimage` where `sha256(preimage) == secret_hash` | On-chain `env.crypto().sha256`, secret-reveal pattern |
| **Timelock + refund** | Claims stop at `expiry`; the sender reclaims the unclaimed remainder afterwards — funds are never stuck | `env.ledger().timestamp()`, escrow lifecycle |
| **Multi-slot "lucky money"** | One envelope → N recipients, `Equal` or `Random` split, exact-to-zero settlement | On-chain PRNG (`env.prng()`), invariant-preserving math |
| **Double-claim guard** | Each recipient can claim a given envelope at most once | Persistent per-`(envelope, address)` keys |
| **Authorization** | `require_auth` on sender (create/refund) and recipient (claim) | Soroban auth framework |
| **Events** | `init` / `create` / `claim` / `refund` / `pause` topics | `env.events().publish` for indexers |
| **Pausable + upgradeable** | Admin can pause new envelopes and upgrade the Wasm without losing state | Admin gating, `update_current_contract_wasm` |
| **Storage TTL management** | Instance + envelope entries are bumped so escrow can't expire mid-claim | `extend_ttl`, persistent vs instance storage |

## Layout

```
contracts/
├─ Cargo.toml              # workspace + release profile (overflow-checks on)
├─ rust-toolchain.toml     # stable + wasm32 target
├─ Makefile                # build / test / optimize / lint
├─ scripts/deploy.sh       # one-command testnet/mainnet deploy + init
├─ ts-client/              # reference TypeScript client for the Next backend
└─ angpao-escrow/
   └─ src/
      ├─ lib.rs            # contract entrypoints
      ├─ types.rs          # Envelope, SplitMode, EnvelopeStatus
      ├─ storage.rs        # DataKey + TTL constants
      ├─ error.rs          # contracterror codes
      └─ test.rs           # 9 unit tests (happy + adversarial paths)
```

## Build & test

```bash
# One-time toolchain
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli   # provides `stellar contract …`

cd contracts
make test        # cargo test — runs the full suite, no network needed
make build       # stellar contract build → target/.../angpao_escrow.wasm
make optimize    # shrink the Wasm for on-chain upload
```

The unit tests cover: single-recipient full claim, equal split, random split
(sum-equals-total invariant), double-claim rejection, wrong-preimage rejection,
post-expiry claim rejection + sender refund, pre-expiry refund rejection, pause
gating, and create-parameter validation.

## Deploy (Testnet)

```bash
cd contracts
./scripts/deploy.sh           # creates+funds an identity, builds, deploys, inits
# → prints SOROBAN_ESCROW_CONTRACT_ID, USDC_SAC_CONTRACT_ID, SOROBAN_RPC_URL
```

For **mainnet**: `NETWORK=mainnet IDENTITY=prod ./scripts/deploy.sh`
(fund the identity first; the script tells you the address).

## Contract API

```
initialize(admin)
create_envelope(sender, token, total_amount, total_slots, secret_hash, expiry, split) -> id
claim(envelope_id, recipient, preimage) -> amount
refund(envelope_id) -> amount
get_envelope(id) -> Envelope        has_claimed(id, recipient) -> bool
total_envelopes() -> u64            is_paused() -> bool        get_admin() -> Address
pause() / unpause() / set_admin(new) / upgrade(wasm_hash)      # admin-only
```

## How it maps onto the existing app

The current app stores gifts in Postgres and funds them with a Stellar-classic
`CreateClaimableBalance` (see `docs/technical-flow.txt`). This contract is a
drop-in **on-chain replacement for the funding/claim leg**:

| App concept (`src/server/db/schema/gifts.ts`) | Contract |
|---|---|
| `gift.secretHash` (sha256 of secret) | `secret_hash` hashlock |
| `gift.amountMinor` | `total_amount` (USDC minor units) |
| `gift.expiresAt` | `expiry` |
| `status: funded → claimed / expired` | `EnvelopeStatus: Active → Completed / Refunded` |
| new: split a gift among many kids | `total_slots` + `SplitMode::Random` |

Integration mirrors the app's existing "server builds XDR → Freighter signs →
server submits" pattern. The wired endpoints live in the Next app:

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/escrow/config` | GET | — | Contract id, USDC SAC id, RPC, passphrase |
| `/api/escrow/create` | POST | wallet | Build `create_envelope` XDR; returns `{ xdr, secret, secretHash, expiry }` |
| `/api/escrow/claim` | POST | wallet | Build `claim` XDR for `{ envelopeId, preimage }` |
| `/api/escrow/refund` | POST | wallet | Build `refund` XDR for `{ envelopeId }` |
| `/api/escrow/submit` | POST | wallet | Submit a Freighter-signed XDR; returns `{ txHash, result }` |
| `/api/escrow/[id]` | GET | — | Read an envelope's on-chain state |

Server code: `src/server/soroban/escrow.client.ts` (the reference client lives at
[`ts-client/angpao-escrow-client.ts`](ts-client/angpao-escrow-client.ts)),
`src/server/service/escrow.service.ts`, `src/server/controller/escrow.controller.ts`.
Configure with `SOROBAN_ESCROW_CONTRACT_ID`, `USDC_SAC_CONTRACT_ID`, `SOROBAN_RPC_URL`.
The DB row becomes a cache/index of on-chain truth keyed by the returned `envelope_id`.

## Security notes

- **Reentrancy:** state is updated **after** computing the payout but the SAC
  `transfer` is the only external call and Soroban has no fallback/receive hooks;
  the per-recipient `Claimed` marker is set in the same invocation, so a repeat
  claim in a separate tx is rejected.
- **Integer safety:** `overflow-checks = true` in release; all amount math traps
  on overflow. The random split reserves ≥1 unit for every remaining slot and the
  final slot sweeps the remainder, so the contract always settles to exactly zero.
- **Auth:** payouts are bound to a `require_auth`'d recipient; refunds to the
  original sender only; admin functions gated by the stored admin.
- **Liveness:** timelock + refund guarantees funds are recoverable; TTL bumps stop
  entries from expiring while escrow is live.
- **Randomness caveat:** `env.prng()` is suitable for fair gift splitting, **not**
  for high-stakes unpredictability (a validator can in principle influence it). Do
  not reuse this split logic for gambling-grade fairness without a commit-reveal.
