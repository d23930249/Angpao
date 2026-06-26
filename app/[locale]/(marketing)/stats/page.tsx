import { setRequestLocale } from 'next-intl/server';
import { StatsClient } from '@/ui/components/pages/stats-client';

export default async function StatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StatsClient />;
}
