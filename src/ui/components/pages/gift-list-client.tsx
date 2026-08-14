'use client';

import { Gift, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Skeleton } from '@/ui/components/ui/skeleton';

interface GiftItem {
  id: string;
  recipientName: string;
  amountUsdc: string;
  message: string;
  status: 'pending' | 'funded' | 'claimed' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  funded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  claimed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_FILTERS = ['all', 'pending', 'funded', 'claimed', 'expired'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function GiftListClient() {
  const t = useTranslations('Gifts');
  const [items, setItems] = useState<GiftItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (status: StatusFilter, cursor: string | null) => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    const query = params.toString();

    try {
      const res = await fetch(`/api/gifts${query ? `?${query}` : ''}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to load');
      const page: GiftItem[] = json.data.gifts ?? [];
      setItems((previous) => (cursor ? [...previous, ...page] : page));
      setNextCursor(json.data.nextCursor ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading gifts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPage(statusFilter, null);
  }, [fetchPage, statusFilter]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchPage(statusFilter, nextCursor);
  };

  const filterBar = (
    <div className="mb-4 flex flex-wrap gap-2" data-testid="gift-status-filter">
      {STATUS_FILTERS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => setStatusFilter(status)}
          aria-pressed={statusFilter === status}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
            statusFilter === status
              ? 'bg-red-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          {status === 'all' ? t('filterAll') : t(`status.${status}`)}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-3" data-testid="gifts-skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        {filterBar}
        <Card className="border-red-100 dark:border-red-900/30" data-testid="empty-state">
          <CardContent className="py-10 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-red-300" />
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
            <Button asChild className="mt-4 bg-red-600 text-white hover:bg-red-700">
              <Link href="/gifts/new">Send your first lucky money</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {filterBar}
      <div className="space-y-3">
        {items.map((gift) => (
          <Link key={gift.id} href={`/gifts/${gift.id}`} className="block" data-testid="gift-item">
            <Card className="border-red-100 transition-all hover:border-red-300 hover:shadow-sm dark:border-red-900/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                      <Gift className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{gift.recipientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(gift.createdAt).toLocaleDateString('en', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-lg font-bold text-red-600">{gift.amountUsdc} USDC</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[gift.status] ?? ''}`}
                    >
                      {gift.status}
                    </span>
                  </div>
                </div>
                {gift.message && (
                  <p className="mt-2 truncate text-xs italic text-muted-foreground">
                    "{gift.message}"
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {nextCursor && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={loadMore}
            disabled={loadingMore}
            data-testid="load-more-gifts"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('loadingMore')}
              </>
            ) : (
              t('loadMore')
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
