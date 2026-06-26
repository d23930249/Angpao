import { redirect } from '@/i18n/routing';

// Consolidated into the single gift page at /dashboard.
export default async function EnvelopesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard', locale });
}
