import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { GiftListClient } from '@/ui/components/pages/gift-list-client';
import { Button } from '@/ui/components/ui/button';

export default async function GiftsPage() {
  const t = await getTranslations('Gifts');

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Angpao</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{t('listTitle')}</h1>
        </div>
        <Button asChild className="bg-red-600 text-white hover:bg-red-700">
          <Link href="/gifts/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('newGift')}
          </Link>
        </Button>
      </div>

      <GiftListClient />
    </div>
  );
}
