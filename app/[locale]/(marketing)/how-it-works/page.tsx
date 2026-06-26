import { setRequestLocale } from 'next-intl/server';
import { HowItWorks } from '@/ui/components/pages/how-it-works';

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HowItWorks />;
}
