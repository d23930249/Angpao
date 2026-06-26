'use client';

import { Gift, Loader2, Lock, Sparkles, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

interface ClaimClientProps {
  giftId: string;
  initialSecret?: string;
}

interface GiftData {
  id: string;
  recipientName: string;
  amountUsdc: string;
  message: string;
  status: string;
}

export function ClaimClient({ giftId, initialSecret = '' }: ClaimClientProps) {
  const [gift, setGift] = useState<GiftData | null>(null);
  const [loadingGift, setLoadingGift] = useState(true);
  const [secret, setSecret] = useState(initialSecret);
  const [destination, setDestination] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/gifts/${giftId}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? 'Gift not found');
        setGift(json.data.gift);
        if (json.data.gift.status === 'claimed') {
          setClaimed(true);
          setClaimMessage('This envelope has already been opened!');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load gift');
      } finally {
        setLoadingGift(false);
      }
    }
    load();
  }, [giftId]);

  async function handleClaim() {
    if (!secret || !destination) {
      toast.error('Please enter both secret and your Stellar address');
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch(`/api/gifts/${giftId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, destinationPublicKey: destination }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Claim failed');
      setClaimed(true);
      setClaimMessage(json.data.message ?? `Lucky money opened! ${json.data.gift.amountUsdc} USDC claimed!`);
      toast.success('🧧 Envelope opened!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to claim');
    } finally {
      setClaiming(false);
    }
  }

  if (loadingGift) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (claimed) {
    return (
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-red-50 dark:from-amber-950/30 dark:to-red-950/20">
        <CardContent className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-xl">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-red-600">🧧 Opened!</h2>
          <p className="mt-2 text-lg font-semibold text-foreground">{claimMessage}</p>
          {gift && (
            <p className="mt-1 text-sm text-muted-foreground">
              From: {gift.recipientName}'s lucky money
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!gift) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">Gift not found or expired.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/20 dark:border-red-900/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-red-600">Open Your Red Envelope</CardTitle>
            <p className="text-sm text-muted-foreground">A gift for {gift.recipientName}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-white/70 p-4 dark:bg-white/10">
          <p className="text-2xl font-bold text-red-600">{gift.amountUsdc} USDC</p>
          {gift.message && (
            <p className="mt-1 text-sm italic text-muted-foreground">"{gift.message}"</p>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-sm text-muted-foreground dark:bg-white/10">
          <Lock className="h-4 w-4 text-red-600" />
          Enter the secret to unlock this envelope
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Secret phrase</Label>
            <Input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter the secret you received"
              className="bg-white/70 dark:bg-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Your Stellar address (to receive USDC)</Label>
            <Input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="G..."
              className="font-mono text-xs bg-white/70 dark:bg-white/10"
            />
          </div>
        </div>

        <Button
          onClick={handleClaim}
          disabled={claiming || !secret || !destination}
          className="w-full bg-red-600 text-white hover:bg-red-700"
          size="lg"
        >
          {claiming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opening…
            </>
          ) : (
            <>
              <Unlock className="mr-2 h-4 w-4" />
              Open envelope
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
