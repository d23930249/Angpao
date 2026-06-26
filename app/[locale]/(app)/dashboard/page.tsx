import { Gift, Plus, Wallet as WalletIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { GiftListClient } from '@/ui/components/pages/gift-list-client';
import { Button } from '@/ui/components/ui/button';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Angpao</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{t('title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-red-600 text-white hover:bg-red-700">
            <Link href="/gifts/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('createGift')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/wallet">
              <WalletIcon className="mr-2 h-4 w-4" />
              {t('openWallet')}
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Gift className="h-4 w-4 text-red-600" />
          {t('recentGifts')}
        </h2>
        <GiftListClient />
      </div>
    </div>
  );
}
