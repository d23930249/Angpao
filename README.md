<div align="center">

# 🧧 Angpao — Send love, send USDC

**Digital red envelopes (lucky money / angpao / Imlek) on Stellar.**
Wrap USDC or XLM in a red envelope, lock it with a secret, and let your loved ones open it with one tap — secured on-chain by a Soroban smart-contract escrow.

[**🚀 Live demo → angpao-five.vercel.app**](https://angpao-five.vercel.app) &nbsp;·&nbsp; [How it works](https://angpao-five.vercel.app/how-it-works) &nbsp;·&nbsp; [Red envelopes](https://angpao-five.vercel.app/dashboard)

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7D00FF) ![Soroban](https://img.shields.io/badge/Soroban-Rust_contract-000000) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![USDC](https://img.shields.io/badge/USDC%20%2F%20XLM-escrow-2775CA)

<br/>

<img src="screen-shot/ui-01-landing-v2.jpg" width="780" alt="Angpao landing page" />

<br/><br/>

<img src="screen-shot/ui-03-create-v2.jpg" width="390" alt="Wrap — create a red envelope (USDC, on-chain)" />
&nbsp;
<img src="screen-shot/ui-08-open-v2.jpg" width="390" alt="Open an envelope by revealing the secret" />

<br/><br/>

<img src="screen-shot/ui-04-lookup-v2.jpg" width="390" alt="Look up an envelope's live on-chain state" />
&nbsp;
<img src="screen-shot/ui-07-wallet-activity-v2.jpg" width="250" alt="Wallet — recent on-chain activity" />

<br/><br/>

<img src="screen-shot/ui-02-how-it-works-v2.jpg" width="700" alt="How it works" />

<sub>Landing · <b>Wrap</b> a red envelope (USDC, one-tap trustline) · <b>Open</b> it with the secret · Look up live on-chain state · Wallet recent activity · How it works</sub>

</div>

---

## What is Angpao?

Giving "lucky money" in a red envelope is a tradition across Asia — lucky money at Tết, angpao at
Lebaran and Imlek. **Angpao brings that ritual on-chain.** A sender wraps USDC (or XLM) into a
digital envelope locked behind a secret; the recipient reveals the secret and the money is
released straight to their Stellar wallet. No middleman ever holds the funds.

Under the hood, the money lives in a **Soroban smart-contract escrow** — hashlocked, time-locked,
and refundable — so the experience is delightful *and* trust-minimized.

## 🔁 How it works

1. **Wrap** — pick an amount and asset (USDC or XLM). Angpao locks it in the on-chain escrow behind
   a SHA-256 secret and gives you an **envelope id + secret**.
2. **Share** — send the envelope id and the secret to your recipient (WhatsApp, Zalo, or in person).
   No QR, no claim links — just two strings.
3. **Open** — the recipient connects their wallet, reveals the secret, and the escrow releases the
   funds straight to them. If nobody opens it before expiry, the sender refunds it.

Every create / open / refund shows up under **Wallet → Recent activity**.

## ✨ Highlights

- **🔒 On-chain escrow, non-custodial.** Funds sit in a Soroban contract, not with us. Only the
  secret-holder can open an envelope; nobody else can move the money.
- **🎁 Hashlock + timelock.** Open by revealing `preimage` where `sha256(preimage)` matches the
  on-chain digest. If it's never opened, the sender reclaims it after expiry — funds are never stuck.
- **🧧 Lucky-money split.** One envelope, many recipients — split **equally** or **at random** for
  that classic "who gets the biggest lucky money" thrill.
- **💵 USDC *and* XLM.** Pick your asset; the app handles trustlines (one-tap **Setup USDC trustline**).
- **👛 Wallet sign-in.** Connect with Freighter — your wallet is your account (SEP-10 style auth).
- **🌏 Bilingual + PWA.** English and Tiếng Việt, installable on mobile, works on slow networks.

## ⛓️ The smart contract

The advanced core is a Rust/Soroban contract — **`AngpaoEscrow`** — deployed and live on Stellar
Testnet. It custodies the asset and releases it only when the rules are met.

| | |
|---|---|
| **Contract ID** | [`CBRSSJN6ZWLV53UCDGAR3ZXHO4O63NACKHYTJOFVKVR4LBBGZGA5LVZD`](https://stellar.expert/explorer/testnet/contract/CBRSSJN6ZWLV53UCDGAR3ZXHO4O63NACKHYTJOFVKVR4LBBGZGA5LVZD) |
| **Network** | Stellar Testnet |
| **Capabilities** | Token escrow (SAC) · hashlock · timelock + refund · multi-slot equal/random split · per-recipient double-claim guard · events · pausable admin · upgradeable |
| **Source & tests** | [`contracts/`](contracts/) — Rust contract, 9 passing unit tests, deploy script, TS client |

Read [`contracts/README.md`](contracts/README.md) for the full design and
[`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md) for the live deployment record and on-chain
proof (real create + claim transactions).

## 🕹️ Try it

1. Install the [Freighter](https://www.freighter.app/) wallet and switch it to **Testnet**.
2. Fund your wallet with test XLM via [friendbot](https://friendbot.stellar.org/).
3. Open the **[live demo](https://angpao-five.vercel.app)** → connect with Freighter.
4. On **[My Gifts](https://angpao-five.vercel.app/dashboard)** (the single gift page):
   *Create* (lock funds), *Open* (reveal the secret), or *Look up* any envelope by id.
   Your on-chain activity shows up under **Wallet → Recent activity**.
   - Want USDC? Pick **USDC**, tap **Setup USDC trustline**, then fund USDC from
     [Circle's faucet](https://faucet.circle.com) or swap a little XLM→USDC.

## 🧱 Tech stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** (strict)
- **Soroban** smart contract in **Rust** (`soroban-sdk`)
- **@stellar/stellar-sdk** + **Freighter** for wallet auth and signing
- **Drizzle ORM** on **Postgres** (Neon)
- **Tailwind v4** + **shadcn/ui** · **next-intl** (en / vi) · PWA
- Deployed on **Vercel** · Web Analytics enabled

## 🚀 Quick start (local dev)

```bash
npm install
cp .env.example .env.local

# Generate a 32+ char SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Edit .env.local: paste SESSION_SECRET, set DRIZZLE_DATABASE_URL (Neon/Supabase/local PG).
npm run db:push:ci      # apply schema
npm run dev             # http://localhost:3000
```

Build the contract: see [`contracts/README.md`](contracts/README.md) (`cargo test`, `stellar
contract build`, `./scripts/deploy.sh`).

## 🗺️ Project structure

```
app/                Next.js routes (pages + API, incl. /api/escrow/*)
src/server/         Backend — controller → service → db, Soroban client (src/server/soroban)
src/ui/             Frontend — components, hooks (useEscrow, useFreighter), i18n
contracts/          Soroban escrow: Rust contract, tests, deploy scripts, TS client
messages/           Translation catalogs (en, vi)
docs/               Architecture & API docs
```

## 📚 Docs

- [`contracts/README.md`](contracts/README.md) — the Soroban escrow contract (the advanced core)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture

---

<div align="center">
<sub>Built on Stellar · Send love, send USDC 🧧</sub>
</div>
