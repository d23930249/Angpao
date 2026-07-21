'use client';

import {
  Check,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  Lock,
  PackageOpen,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { publicEnv } from '@/server/config/env.public';
import { explorerContractUrl, networkLabel } from '@/ui/lib/explorer';
import type { OnChainEnvelope, SplitMode } from '@/ui/hooks/useEscrow';
import { useEscrow } from '@/ui/hooks/useEscrow';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';

const STATUS_LABELS = ['Active', 'Completed', 'Refunded'];
const SPLIT_LABELS = ['Equal', 'Random'];

const STELLAR_NETWORK = publicEnv.NEXT_PUBLIC_STELLAR_NETWORK;

/** Fire-and-forget: log an on-chain action so it shows in the wallet activity. */
function recordActivity(body: {
  action: 'create' | 'open' | 'refund';
  envelopeId?: string;
  asset: string;
  amount?: string;
}) {
  fetch('/api/escrow/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  }).catch(() => {});
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="mr-2 h-3.5 w-3.5 text-success" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

export function OnchainClient() {
  const t = useTranslations('Onchain');
  const {
    config,
    busy,
    createEnvelope,
    claimEnvelope,
    lookupEnvelope,
    checkUsdcTrustline,
    setupUsdcTrustline,
  } = useEscrow();

  const assets =
    config?.assets && config.assets.length > 0
      ? config.assets
      : [{ code: 'XLM', tokenId: '', decimals: 7 }];
  const assetByToken = (tokenId: string) => assets.find((a) => a.tokenId === tokenId) ?? assets[0];
  const fmt = (minor: string, dec: number) =>
    (Number(minor) / 10 ** dec).toLocaleString(undefined, { maximumFractionDigits: dec });

  // Create state
  const [amount, setAmount] = useState('1');
  const [assetCode, setAssetCode] = useState('');
  const [slots, setSlots] = useState('1');
  const [split, setSplit] = useState<SplitMode>('Equal');
  const [created, setCreated] = useState<{ envelopeId: string; secret: string } | null>(null);

  const activeAsset = assets.find((a) => a.code === assetCode) ?? assets[0];
  const isUsdc = activeAsset.code === 'USDC';

  // Trustline state (only relevant for classic assets like USDC)
  const [trustlineOk, setTrustlineOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isUsdc) {
      setTrustlineOk(null);
      return;
    }
    let cancelled = false;
    setTrustlineOk(null);
    checkUsdcTrustline()
      .then((okTrust) => {
        if (!cancelled) setTrustlineOk(okTrust);
      })
      .catch(() => {
        if (!cancelled) setTrustlineOk(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isUsdc, checkUsdcTrustline]);

  async function onSetupTrustline() {
    try {
      await setupUsdcTrustline();
      setTrustlineOk(true);
      toast.success(t('trustlineDone'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'));
    }
  }

  // Claim state
  const [claimId, setClaimId] = useState('');
  const [secret, setSecret] = useState('');
  const [claimed, setClaimed] = useState<{ amount: string; code: string; decimals: number } | null>(
    null,
  );

  // Lookup state
  const [lookupId, setLookupId] = useState('');
  const [envelope, setEnvelope] = useState<OnChainEnvelope | null>(null);

  async function onCreate() {
    setCreated(null);
    try {
      const r = await createEnvelope({
        amount,
        asset: activeAsset.code,
        totalSlots: Number.parseInt(slots, 10) || 1,
        split,
      });
      setCreated({ envelopeId: r.envelopeId, secret: r.secret });
      recordActivity({ action: 'create', envelopeId: r.envelopeId, asset: activeAsset.code, amount });
      toast.success(t('createdToast', { id: r.envelopeId }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'));
    }
  }

  async function onClaim() {
    setClaimed(null);
    try {
      const id = Number.parseInt(claimId, 10);
      const r = await claimEnvelope({ envelopeId: id, preimage: secret.trim() });
      // Resolve which asset this envelope held so we format the payout correctly.
      const e = await lookupEnvelope(id).catch(() => null);
      const a = e ? assetByToken(e.token) : activeAsset;
      setClaimed({ amount: r.amount, code: a.code, decimals: a.decimals });
      recordActivity({
        action: 'open',
        envelopeId: String(id),
        asset: a.code,
        amount: fmt(r.amount, a.decimals),
      });
      toast.success(t('claimedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'));
    }
  }

  async function onLookup() {
    setEnvelope(null);
    try {
      const e = await lookupEnvelope(Number.parseInt(lookupId, 10));
      if (!e) {
        toast.error(t('notFound'));
        return;
      }
      setEnvelope(e);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Lock className="h-6 w-6 text-red-600" />
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {config?.contractId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-100 bg-card p-3 text-xs dark:border-red-900/30">
          <Badge variant="outline" className="font-mono">
            {config.contractId.slice(0, 6)}…{config.contractId.slice(-4)}
          </Badge>
          <span className="text-muted-foreground">
            {t('liveOnNetwork', { network: networkLabel(STELLAR_NETWORK) })}
          </span>
          <a
            className="ml-auto inline-flex items-center gap-1 text-red-600 hover:underline"
            href={explorerContractUrl(STELLAR_NETWORK, config.contractId)}
            target="_blank"
            rel="noreferrer"
          >
            {t('viewOnExplorer')} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}

      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">
            <Gift className="mr-1.5 h-4 w-4" />
            {t('tabCreate')}
          </TabsTrigger>
          <TabsTrigger value="claim">
            <PackageOpen className="mr-1.5 h-4 w-4" />
            {t('tabClaim')}
          </TabsTrigger>
          <TabsTrigger value="lookup">
            <Search className="mr-1.5 h-4 w-4" />
            {t('tabLookup')}
          </TabsTrigger>
        </TabsList>

        {/* CREATE */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('createTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('createHint')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {assets.length > 1 ? (
                <div className="space-y-1.5">
                  <Label>{t('assetLabel')}</Label>
                  <Select value={activeAsset.code} onValueChange={setAssetCode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          {a.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {isUsdc && trustlineOk === false ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <span className="text-xs text-muted-foreground">{t('trustlineNeeded')}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onSetupTrustline}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    )}
                    {t('trustlineCta')}
                  </Button>
                </div>
              ) : null}
              {isUsdc && trustlineOk === true ? (
                <p className="flex items-center gap-2 text-xs text-success">
                  <Check className="h-3.5 w-3.5" /> {t('trustlineActive')}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="oc-amount">
                    {t('amountLabel')} ({activeAsset.code})
                  </Label>
                  <Input
                    id="oc-amount"
                    type="number"
                    min="0.000001"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="oc-slots">{t('slotsLabel')}</Label>
                  <Input
                    id="oc-slots"
                    type="number"
                    min="1"
                    max="100"
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('splitLabel')}</Label>
                <Select value={split} onValueChange={(v) => setSplit(v as SplitMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equal">{t('splitEqual')}</SelectItem>
                    <SelectItem value="Random">{t('splitRandom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                {t('usdcNote', { asset: activeAsset.code })}
              </p>

              <Button
                onClick={onCreate}
                disabled={busy}
                className="w-full bg-red-600 text-white hover:bg-red-700"
                size="lg"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                {t('createButton')}
              </Button>

              {created ? (
                <div className="space-y-3 rounded-xl border border-success/40 bg-success/5 p-4">
                  <p className="text-sm font-semibold text-foreground">{t('createdTitle')}</p>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{t('envelopeId')}</span>
                    <span className="font-mono font-bold">#{created.envelopeId}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('secretReveal')}</p>
                    <code className="block break-all rounded-lg bg-background p-2 text-xs">
                      {created.secret}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <CopyButton value={created.secret} label={t('copySecret')} />
                    <CopyButton value={created.envelopeId} label={t('copyId')} />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLAIM */}
        <TabsContent value="claim">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('claimTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('claimHint')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="oc-claim-id">{t('envelopeId')}</Label>
                <Input
                  id="oc-claim-id"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oc-secret">{t('secretLabel')}</Label>
                <Input
                  id="oc-secret"
                  placeholder={t('secretPlaceholder')}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                />
              </div>
              <Button
                onClick={onClaim}
                disabled={busy || !claimId || !secret}
                className="w-full bg-red-600 text-white hover:bg-red-700"
                size="lg"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-2 h-4 w-4" />}
                {t('claimButton')}
              </Button>
              {claimed ? (
                <div className="rounded-xl border border-success/40 bg-success/5 p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('claimedTitle')}</p>
                  <p className="mt-1 text-2xl font-bold text-success">
                    {fmt(claimed.amount, claimed.decimals)} {claimed.code}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOOKUP */}
        <TabsContent value="lookup">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('lookupTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('lookupHint')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                />
                <Button onClick={onLookup} disabled={!lookupId} variant="outline">
                  <Search className="mr-2 h-4 w-4" />
                  {t('lookupButton')}
                </Button>
              </div>
              {envelope ? (
                <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
                  <Row label={t('statusLabel')}>
                    <Badge variant="outline">{STATUS_LABELS[envelope.status] ?? envelope.status}</Badge>
                  </Row>
                  <Row label={t('amountLabel')}>
                    {fmt(envelope.total_amount, assetByToken(envelope.token).decimals)}{' '}
                    {assetByToken(envelope.token).code}
                  </Row>
                  <Row label={t('remainingLabel')}>
                    {fmt(envelope.remaining_amount, assetByToken(envelope.token).decimals)}{' '}
                    {assetByToken(envelope.token).code}
                  </Row>
                  <Row label={t('slotsLabel')}>
                    {envelope.claimed_slots} / {envelope.total_slots}
                  </Row>
                  <Row label={t('splitLabel')}>{SPLIT_LABELS[envelope.split] ?? envelope.split}</Row>
                  <Row label={t('senderLabel')}>
                    <span className="font-mono text-xs">
                      {envelope.sender.slice(0, 6)}…{envelope.sender.slice(-4)}
                    </span>
                  </Row>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  );
}
