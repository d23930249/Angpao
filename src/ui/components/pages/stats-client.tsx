'use client';

import { Gift, Loader2, Lock, RefreshCw, Send, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';

interface Stats {
  uniqueWallets: number;
  totalLogins: number;
  totalGifts: number;
  giftSenders: number;
  onchainEnvelopes: number | null;
  perDay: Array<{ date: string; users: number; logins: number }>;
  generatedAt: string;
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 text-red-600" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to load stats');
      setStats(json.data as Stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxDay = stats?.perDay.reduce((m, d) => Math.max(m, d.logins), 0) ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-red-600 hover:underline">
            ← Angpao
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Usage metrics</h1>
          <p className="text-sm text-muted-foreground">
            Real wallet users — demo seed data excluded.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {stats ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              icon={Users}
              label="Unique wallet users"
              value={stats.uniqueWallets}
              hint="distinct wallets signed in"
            />
            <Metric
              icon={Send}
              label="Total logins"
              value={stats.totalLogins}
              hint="wallet sign-ins"
            />
            <Metric
              icon={Lock}
              label="On-chain envelopes"
              value={stats.onchainEnvelopes ?? '—'}
              hint="created on the Soroban contract"
            />
            <Metric icon={Gift} label="Gifts created" value={stats.totalGifts} />
            <Metric icon={Users} label="Gift senders" value={stats.giftSenders} />
          </div>

          <div className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Daily activity (last 14 days)
            </h2>
            {stats.perDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sign-ins yet.</p>
            ) : (
              <div className="space-y-1.5">
                {stats.perDay.map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {d.date}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-red-500"
                        style={{ width: `${maxDay ? (d.logins / maxDay) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                      {d.users} users · {d.logins} logins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Updated {new Date(stats.generatedAt).toLocaleString()} · For richer traffic
            analytics, enable Vercel Web Analytics in the project dashboard.
          </p>
        </>
      ) : loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </main>
  );
}
