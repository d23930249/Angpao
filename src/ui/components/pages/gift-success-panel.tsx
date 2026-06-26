'use client';

import { Check, Copy, Gift, QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';

interface GiftSuccessPanelProps {
  giftId: string;
  recipientName: string;
  amountUsdc: string;
  secret: string;
  message?: string;
}

export function GiftSuccessPanel({
  giftId,
  recipientName,
  amountUsdc,
  secret,
  message,
}: GiftSuccessPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const claimUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/claim?giftId=${giftId}&secret=${secret}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, claimUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#dc2626', light: '#fff7f7' },
      });
    }
  }, [claimUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      toast.success('Claim link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className="space-y-4">
      {/* Success header */}
      <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-amber-50 p-6 text-center dark:from-red-950/30 dark:to-amber-950/20 dark:border-red-900/40">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
          <Gift className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-red-600">Envelope Ready! 🧧</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {amountUsdc} USDC sealed for {recipientName}
        </p>
        {message && (
          <p className="mt-2 rounded-lg bg-white/70 px-4 py-2 text-sm italic text-muted-foreground dark:bg-white/10">
            "{message}"
          </p>
        )}
      </div>

      {/* QR Code */}
      <Card className="border-red-100 dark:border-red-900/30">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <QrCode className="h-4 w-4" />
            Scan to claim
          </div>
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
            <canvas ref={canvasRef} className="block" />
          </div>
          <div className="w-full space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Secret phrase (share with recipient):
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <code className="flex-1 text-sm font-mono text-foreground break-all">{secret}</code>
            </div>
          </div>
          <Button
            onClick={copyLink}
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
    </div>
  );
}
