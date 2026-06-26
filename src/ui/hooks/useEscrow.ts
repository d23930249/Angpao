'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFreighter } from './useFreighter';

export type SplitMode = 'Equal' | 'Random';

export interface EscrowAsset {
  code: string;
  tokenId: string;
  decimals: number;
}

export interface EscrowConfig {
  enabled: boolean;
  contractId: string | null;
  assets: EscrowAsset[];
  rpcUrl: string;
  networkPassphrase: string;
}

export interface OnChainEnvelope {
  sender: string;
  token: string;
  total_amount: string;
  remaining_amount: string;
  total_slots: number;
  claimed_slots: number;
  secret_hash: string;
  expiry: string;
  split: number;
  status: number;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json.data as T;
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json.data as T;
}

/**
 * Drives the on-chain escrow flows. Each mutation follows the app's standard
 * pattern: the server builds an unsigned XDR, Freighter signs it, the server
 * submits it. Returns the contract's parsed return value.
 */
export function useEscrow() {
  const { signAuthEntry, isConnected, isAvailable } = useFreighter();
  const [config, setConfig] = useState<EscrowConfig | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<EscrowConfig>('/api/escrow/config')
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createEnvelope = useCallback(
    async (input: { amount: string; asset: string; totalSlots: number; split: SplitMode }) => {
      setBusy(true);
      try {
        const { xdr, secret, expiry, asset } = await apiPost<{
          xdr: string;
          secret: string;
          secretHash: string;
          expiry: number;
          asset: string;
        }>('/api/escrow/create', input);
        const signed = await signAuthEntry(xdr);
        const { result } = await apiPost<{ txHash: string; result: unknown }>(
          '/api/escrow/submit',
          { signedXdr: signed },
        );
        return { envelopeId: String(result), secret, expiry, asset };
      } finally {
        setBusy(false);
      }
    },
    [signAuthEntry],
  );

  const claimEnvelope = useCallback(
    async (input: { envelopeId: number; preimage: string }) => {
      setBusy(true);
      try {
        const { xdr } = await apiPost<{ xdr: string }>('/api/escrow/claim', input);
        const signed = await signAuthEntry(xdr);
        const { result } = await apiPost<{ txHash: string; result: unknown }>(
          '/api/escrow/submit',
          { signedXdr: signed },
        );
        return { amount: String(result) };
      } finally {
        setBusy(false);
      }
    },
    [signAuthEntry],
  );

  const refundEnvelope = useCallback(
    async (envelopeId: number) => {
      setBusy(true);
      try {
        const { xdr } = await apiPost<{ xdr: string }>('/api/escrow/refund', { envelopeId });
        const signed = await signAuthEntry(xdr);
        const { result } = await apiPost<{ txHash: string; result: unknown }>(
          '/api/escrow/submit',
          { signedXdr: signed },
        );
        return { amount: String(result) };
      } finally {
        setBusy(false);
      }
    },
    [signAuthEntry],
  );

  const lookupEnvelope = useCallback(async (envelopeId: number) => {
    const { envelope } = await apiGet<{ envelope: OnChainEnvelope | null }>(
      `/api/escrow/${envelopeId}`,
    );
    return envelope;
  }, []);

  const checkUsdcTrustline = useCallback(async () => {
    const { hasTrustline } = await apiGet<{ hasTrustline: boolean }>('/api/escrow/trustline');
    return hasTrustline;
  }, []);

  /** Build + sign + submit a ChangeTrust that adds a USDC trustline. */
  const setupUsdcTrustline = useCallback(async () => {
    setBusy(true);
    try {
      const { xdr } = await apiPost<{ xdr: string }>('/api/escrow/trustline', {});
      const signed = await signAuthEntry(xdr);
      await apiPost('/api/escrow/trustline/submit', { signedXdr: signed });
    } finally {
      setBusy(false);
    }
  }, [signAuthEntry]);

  return {
    config,
    busy,
    walletReady: isAvailable && isConnected,
    createEnvelope,
    claimEnvelope,
    refundEnvelope,
    lookupEnvelope,
    checkUsdcTrustline,
    setupUsdcTrustline,
  };
}
