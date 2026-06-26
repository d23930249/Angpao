import { Gift } from 'lucide-react';
import { ClaimClient } from '@/ui/components/pages/claim-client';

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ giftId?: string; secret?: string }>;
}) {
  const { giftId, secret } = await searchParams;

  if (!giftId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/10 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Gift className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Invalid claim link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is missing the gift ID. Ask the sender to share the correct link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/10 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Angpao</p>
          <p className="mt-1 text-sm text-muted-foreground">You have received a red envelope 🧧</p>
        </div>
        <ClaimClient giftId={giftId} initialSecret={secret ?? ''} />
      </div>
    </div>
  );
}
