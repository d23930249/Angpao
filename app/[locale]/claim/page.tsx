import { redirect } from '@/i18n/routing';

// Claiming is unified into the single gift page "Open" flow at /dashboard.
export default async function ClaimPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard', locale });
}
