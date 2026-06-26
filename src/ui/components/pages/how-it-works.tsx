'use client';

import {
  ArrowLeft,
  ArrowRight,
  Coins,
  ExternalLink,
  Gift,
  Lock,
  PackageOpen,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/ui/components/ui/button';
import { GradientBg } from '@/ui/components/shared/gradient-bg';
import { LanguageSwitcher } from '@/ui/components/shared/language-switcher';
import { ThemeToggle } from '@/ui/components/shared/theme-toggle';

export function HowItWorks() {
  const t = useTranslations('HowItWorks');
  const [contractId, setContractId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/escrow/config')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.ok) setContractId(j.data.contractId ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = [
    { icon: Gift, title: t('step1Title'), desc: t('step1Desc') },
    { icon: QrCode, title: t('step2Title'), desc: t('step2Desc') },
    { icon: Sparkles, title: t('step3Title'), desc: t('step3Desc') },
  ];

  const features = [
    { icon: Lock, title: t('feat1Title'), desc: t('feat1Desc') },
    { icon: RotateCcw, title: t('feat2Title'), desc: t('feat2Desc') },
    { icon: Coins, title: t('feat3Title'), desc: t('feat3Desc') },
    { icon: ShieldCheck, title: t('feat4Title'), desc: t('feat4Desc') },
  ];

  return (
    <main className="relative">
      <GradientBg />
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-red-600">
          <Gift className="h-5 w-5" />
          Angpao
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>

        <p className="mb-2 text-xs uppercase tracking-widest text-red-600">{t('eyebrow')}</p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight text-foreground md:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>

        {/* The 3-step flow */}
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="rounded-2xl border border-red-100 bg-card p-6 dark:border-red-900/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <Icon className="h-5 w-5 text-red-600" />
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">
                {t('stepLabel', { n: i + 1 })}
              </p>
              <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Under the hood — on-chain escrow */}
        <div className="mt-20">
          <p className="mb-2 text-xs uppercase tracking-widest text-red-600">
            {t('underHoodEyebrow')}
          </p>
          <h2 className="text-3xl font-bold text-foreground">{t('underHoodTitle')}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t('underHoodSubtitle')}</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <Icon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {contractId ? (
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-red-100 bg-card p-4 text-sm dark:border-red-900/30">
              <Lock className="h-4 w-4 text-red-600" />
              <span className="text-muted-foreground">{t('contractLabel')}</span>
              <code className="font-mono text-xs">
                {contractId.slice(0, 8)}…{contractId.slice(-6)}
              </code>
              <a
                className="ml-auto inline-flex items-center gap-1 text-red-600 hover:underline"
                href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('viewOnExplorer')} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}
        </div>

        {/* CTAs */}
        <div className="mt-16 flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="h-11 rounded-full bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Link href="/connect">
              {t('ctaPrimary')} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-6 text-sm">
            <Link href="/envelopes">
              <PackageOpen className="mr-2 h-4 w-4" />
              {t('ctaSecondary')}
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
