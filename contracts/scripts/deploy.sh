#!/usr/bin/env bash
#
# Deploy AngpaoEscrow to Stellar Testnet (or Mainnet) with the Stellar CLI.
#
# Prereqs:
#   - Rust + wasm32-unknown-unknown target  (rustup target add wasm32-unknown-unknown)
#   - Stellar CLI                            (cargo install --locked stellar-cli)
#
# Usage:
#   ./scripts/deploy.sh                 # testnet, identity "angpao"
#   NETWORK=mainnet IDENTITY=prod ./scripts/deploy.sh
#
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-angpao}"
# Stellar CLI ≥ v23 builds to the wasm32v1-none target.
WASM="target/wasm32v1-none/release/angpao_escrow.wasm"

cd "$(dirname "$0")/.."

echo "▶ Network: $NETWORK   Identity: $IDENTITY"

# 1. Ensure a funded identity exists (Testnet auto-funds via friendbot).
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  echo "▶ Creating identity '$IDENTITY'…"
  if [ "$NETWORK" = "testnet" ]; then
    stellar keys generate --global "$IDENTITY" --network testnet --fund
  else
    stellar keys generate --global "$IDENTITY"
    echo "  Fund $(stellar keys address "$IDENTITY") on mainnet, then re-run."
    exit 1
  fi
fi
ADMIN_ADDR="$(stellar keys address "$IDENTITY")"
echo "▶ Admin address: $ADMIN_ADDR"

# 2. Build the optimized Wasm.
echo "▶ Building contract…"
stellar contract build
stellar contract optimize --wasm "$WASM" || true

# 3. Deploy → contract id.
echo "▶ Deploying…"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "▶ Contract id: $CONTRACT_ID"

# 4. Initialize with the admin.
echo "▶ Initializing…"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDR"

# 5. Resolve the USDC Stellar Asset Contract (SAC) id for the network.
#    Testnet USDC issuer comes from the app's .env (.env.example).
if [ "$NETWORK" = "testnet" ]; then
  USDC_ISSUER="${USDC_ASSET_ISSUER_TESTNET:-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5}"
else
  USDC_ISSUER="${USDC_ASSET_ISSUER_PUBLIC:-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN}"
fi
echo "▶ Ensuring USDC SAC exists for USDC:$USDC_ISSUER …"
USDC_SAC=$(stellar contract id asset --asset "USDC:$USDC_ISSUER" --network "$NETWORK")
# Deploy the SAC if it has never been wrapped on this network (id is deterministic).
stellar contract asset deploy --asset "USDC:$USDC_ISSUER" --source "$IDENTITY" --network "$NETWORK" 2>/dev/null || true
echo "▶ USDC SAC id: $USDC_SAC"

echo ""
echo "✅ Done. Add these to your app env (.env / Vercel):"
echo "   SOROBAN_ESCROW_CONTRACT_ID=$CONTRACT_ID"
echo "   USDC_SAC_CONTRACT_ID=$USDC_SAC"
echo "   SOROBAN_RPC_URL=https://soroban-${NETWORK}.stellar.org"
