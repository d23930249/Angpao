'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { GiftCreateForm } from '@/ui/components/pages/gift-create-form';
import { GiftSuccessPanel } from '@/ui/components/pages/gift-success-panel';
import { Button } from '@/ui/components/ui/button';

interface CreatedGift {
  gift: {
    id: string;
    recipientName: string;
    amountUsdc: string;
    status: string;
    message?: string;
  };
  secret: string;
}

export default function NewGiftPage() {
  const t = useTranslations('Gifts');
  const [created, setCreated] = useState<CreatedGift | null>(null);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/gifts">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{t('newTitle')}</h1>
      </div>

      {created ? (
        <GiftSuccessPanel
          giftId={created.gift.id}
          recipientName={created.gift.recipientName}
          amountUsdc={created.gift.amountUsdc}
          secret={created.secret}
          message={created.gift.message}
        />
      ) : (
        <GiftCreateForm onCreated={setCreated} />
      )}
    </div>
  );
}
