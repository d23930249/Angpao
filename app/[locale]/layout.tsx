import { Analytics } from '@vercel/analytics/react';
import type { Metadata, Viewport } from 'next';
import { Lato, Raleway } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { publicEnv } from '@/server/config/env.public';
import { PwaInstallPrompt } from '@/ui/components/pwa/pwa-install-prompt';
import { ServiceWorkerRegistration } from '@/ui/components/pwa/service-worker-registration';
import { Toaster } from '@/ui/components/ui/sonner';
import '../globals.css';

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});
const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const tBrand = await getTranslations({ locale, namespace: 'Hero' });
  const brandEyebrow = tBrand('eyebrow');
  const title = t('title');
  const description = t('description');
  const metadataBase = new URL(publicEnv.NEXT_PUBLIC_APP_URL);
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = loc === routing.defaultLocale ? '/' : `/${loc}`;
  }
  return {
    metadataBase,
    title: {
      default: title,
      template: `%s · ${brandEyebrow}`,
    },
    description,
    applicationName: brandEyebrow,
    keywords: ['Stellar', 'USDC', 'gift', 'red envelope', 'lì xì', 'Tet', 'angpao'],
    authors: [{ name: brandEyebrow }],
    generator: 'Next.js',
    alternates: {
      canonical: '/',
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: brandEyebrow,
      title,
      description,
      url: './',
      locale: locale.replace('-', '_'),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${raleway.variable} ${lato.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
            <ServiceWorkerRegistration />
            <PwaInstallPrompt />
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
