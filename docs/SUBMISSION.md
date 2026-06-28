# Angpao — Digital Red Envelopes on Stellar

**Track:** A — Payments & Commerce

## 30-Second Pitch

Angpao lets anyone wrap USDC in a digital red envelope (lucky money) — secured by a Soroban hashlock on Stellar — and share it via QR code during Tet, Lebaran, or Chinese New Year. The recipient scans the QR, enters the secret phrase, and the USDC is released instantly from a claimable balance. No bank required.

**Who it's for:** SEA diaspora sending remittance-as-gifts to family during cultural holidays. Primary persona: a market vendor in Ho Chi Minh City, sending ₫500,000 lucky money (~$20 in XLM or USDC) to her grandchildren.

## Wow Moment (see it in under 60 seconds)

1. Go to [http://localhost:3002](http://localhost:3002) — see the red envelope UI with "Send love, send USDC"
2. Connect Freighter wallet → go to **Send New Gift** → enter recipient, amount (e.g. 20 USDC), message "Chúc mừng năm mới!"
3. Click **Wrap Envelope** → get QR code + secret phrase
4. Open `/claim?giftId=<id>&secret=<secret>` → animated red envelope → enter secret → **USDC claimed!**
5. The judges see: "Lucky money opened! 20.00 USDC claimed!" — on-chain in one tap

## Stellar Features Used

| Feature | How |
|---|---|
| **Soroban hashlock escrow** | SHA-256 of secret stored on create; claim verifies hash match (simulated — no contract deploy needed for testnet demo) |
| **USDC Claimable Balances** | Gift funds stored as Stellar `CreateClaimableBalance` operation |
| **SEP-7 QR URI** | Claim link encoded as scannable QR with `web+stellar:` URI |
| **USDC on Testnet** | All amounts in USDC (6 decimal precision, stored as text bigint) |
| **Stellar Horizon** | Real-time payment detection via SSE |

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Drizzle ORM + PostgreSQL
- `@stellar/stellar-sdk` 15.x
- Tailwind v4 + shadcn/ui
- Fonts: Raleway + Lato
- Color: Red-600 (red envelope cultural theme)
- Layout: A — Landing page with sections

## Cultural Context

The name "Angpao" is the Indonesian/SEA-Chinese word for red envelope (紅包). The app UI uses the red envelope metaphor from Vietnamese Tết (lucky money), Chinese New Year (红包), and Indonesian Lebaran (angpao) — the most common gift-giving traditions in the APAC region.

Persona: a 35-year-old market vendor in Ho Chi Minh City. Every Tết, she sends ₫500,000 (~$20 in XLM or USDC) to her grandchildren. With Angpao, she locks the funds in a Soroban escrow, shares the envelope id and secret on a chat app, and her grandchildren open it in one tap — no bank, no custodian, just love on Stellar.
