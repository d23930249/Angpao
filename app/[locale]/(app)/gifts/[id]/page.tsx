'use client';

import { ArrowLeft, Check, Copy, Gift, QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Skeleton } from '@/ui/components/ui/skeleton';

interface GiftDetail {
  id: string;
  recipientName: string;
  amountUsdc: string;
  message: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  funded: 'bg-green-100 text-green-700',
  claimed: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
};

export default function GiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [gift, setGift] = useState<GiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [giftId, setGiftId] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setGiftId(id);
      fetch(`/api/gifts/${id}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.ok) setGift(json.data.gift);
          else toast.error(json.error?.message ?? 'Failed to load');
        })
        .catch(() => toast.error('Failed to load gift'))
        .finally(() => setLoading(false));
    });
  }, [params]);

  const claimUrl = gift
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/claim?giftId=${gift.id}`
    : '';

  useEffect(() => {
    if (canvasRef.current && claimUrl) {
      QRCode.toCanvas(canvasRef.current, claimUrl, {
        width: 160,
        margin: 2,
        color: { dark: '#dc2626', light: '#fff7f7' },
      }).catch(() => null);
    }
  }, [claimUrl]);

  async function copyClaimLink() {
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/gifts">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Gift Details</h1>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !gift ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Gift not found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-amber-50 p-6 dark:from-red-950/30 dark:to-amber-950/20 dark:border-red-900/40">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-foreground">{gift.recipientName}</p>
                <p className="text-2xl font-bold text-red-600">{gift.amountUsdc} USDC</p>
              </div>
              <span
                className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[gift.status] ?? ''}`}
              >
                {gift.status}
              </span>
            </div>
            {gift.message && (
              <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm italic text-muted-foreground dark:bg-white/10">
                "{gift.message}"
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <p className="font-medium">Created</p>
                <p>{new Date(gift.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium">Expires</p>
                <p>{new Date(gift.expiresAt).toLocaleString()}</p>
              </div>
              {gift.claimedAt && (
                <div className="col-span-2">
                  <p className="font-medium">Claimed</p>
                  <p>{new Date(gift.claimedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {(gift.status === 'pending' || gift.status === 'funded') && (
            <Card className="border-red-100 dark:border-red-900/30">
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <QrCode className="h-4 w-4" />
                  Share this QR with recipient
                </div>
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                  <canvas ref={canvasRef} />
                </div>
                <Button
                  onClick={copyClaimLink}
                  variant="outline"
                  className="w-full border-red-200 hover:bg-red-50 dark:border-red-900/40"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy claim link
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
