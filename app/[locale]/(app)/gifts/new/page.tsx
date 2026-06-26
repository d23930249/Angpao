import { redirect } from '@/i18n/routing';

// Unified into the single gift page at /dashboard.
export default async function NewGiftPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard', locale });
}
