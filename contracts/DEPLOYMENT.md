# AngpaoEscrow — Testnet deployment record

Live, verified deployment of the `angpao-escrow` Soroban contract on **Stellar Testnet**.

## Addresses

| Item | Value |
|---|---|
| **Contract ID** | `CBRSSJN6ZWLV53UCDGAR3ZXHO4O63NACKHYTJOFVKVR4LBBGZGA5LVZD` |
| Wasm hash | `0fdc7b299168c6bf4b313c90da6525d2ace0f1a35d316464c318060a78c27276` |
| Admin | `GBIYNTWORZG23DQX7XRVKX56HGJ23QEMDPCLE6472T5H7ZJFAQ45BJX5` |
| Network | Test SDF Network ; September 2015 |
| Wasm size | 12,727 bytes (optimized) |

Explorer: https://stellar.expert/explorer/testnet/contract/CBRSSJN6ZWLV53UCDGAR3ZXHO4O63NACKHYTJOFVKVR4LBBGZGA5LVZD

## On-chain proof (end-to-end)

| Step | Tx |
|---|---|
| Upload + deploy | [`4128c176…`](https://stellar.expert/explorer/testnet/tx/4128c176d51ddbca1027f9ffc5cf4cdf79af4d480a08f3f347a58b56377efa94) |
| `initialize(admin)` | [`83583dc9…`](https://stellar.expert/explorer/testnet/tx/83583dc99e4e2631fb7dfee257cf7e04ce807058e08517aaa48a13c6d84930c8) |
| `create_envelope` (escrow 0.1 XLM, hashlock, 1 slot) | [`88d305a7…`](https://stellar.expert/explorer/testnet/tx/88d305a7a9f5314e432edb615883f1c52fc2a8956d7608908aedc722c38d80ea) |
| `claim` (reveal preimage → payout to recipient) | [`ec817756…`](https://stellar.expert/explorer/testnet/tx/ec8177567cd43af85e19f675be2a9c6bfafbe56b08c60bfdb3cab11c7b3b0203) |

After the claim, `get_envelope(1)` returns `status: 1 (Completed)`, `remaining_amount: 0`,
`claimed_slots: 1` — the hashlocked escrow paid out exactly once and settled to zero.

The hashlock used `secret_hash = sha256(preimage)` where
`preimage = 07…07 (32 bytes)` → `secret_hash = 4bb06f8e4e3a7715d201d573d0aa423762e55dabd61a2c02278fa56cc6d294e0`.

## Toolchain used (Windows)

- Rust `1.96.0`, toolchain **`stable-x86_64-pc-windows-gnu`** (self-linking; avoids
  needing MSVC Build Tools). Select per-build with `RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu`
  or `cargo +stable-x86_64-pc-windows-gnu …`.
- Target **`wasm32v1-none`** (`rustup target add wasm32v1-none`) — required by Stellar CLI ≥ v23.
- Stellar CLI `27.0.0`.
- `soroban-sdk 22.0.11`.

## Reproduce

```bash
cd contracts
cargo +stable-x86_64-pc-windows-gnu test          # 9/9 pass
RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu stellar contract build
NETWORK=testnet ./scripts/deploy.sh               # deploy + initialize
```

## Redeploy / upgrade notes

- The contract is **upgradeable** (`upgrade(wasm_hash)`, admin-gated). To ship a new
  version without losing escrow state: build, `stellar contract upload --wasm …` to get a
  new hash, then `invoke … -- upgrade --new_wasm_hash <hash>`.
- For **mainnet**: `NETWORK=mainnet IDENTITY=prod ./scripts/deploy.sh`
  (fund the identity first), then point the app's `SOROBAN_ESCROW_CONTRACT_ID` at it.
