'use client';

import { ArrowRight, Gift, Lock, Send, Sparkles, Unlock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/ui/components/ui/button';

export function LandingHero() {
  const t = useTranslations('Hero');
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 pb-16 md:pt-36 md:pb-24">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-red-600">
            <Gift className="h-3.5 w-3.5" />
            {t('eyebrow')}
          </p>
          <h1 className="text-5xl font-bold leading-[1.05] text-foreground md:text-6xl">
            {t('title')
              .split('\n')
              .map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t('subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Link href="/dashboard">
                {t('ctaPrimary')} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 rounded-full px-6 text-sm font-medium"
            >
              <Link href="/how-it-works">{t('ctaSecondary')}</Link>
            </Button>
          </div>
        </div>

        {/* Red envelope preview card */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-amber-50 p-6 shadow-xl dark:from-red-950/30 dark:to-amber-950/20 dark:border-red-900/40">
            {/* Envelope flap decoration */}
            <div className="absolute -top-1 left-0 right-0 h-16 overflow-hidden">
              <div className="absolute left-0 right-0 top-0 h-0 border-l-[50vw] border-r-[50vw] border-t-[64px] border-l-transparent border-r-transparent border-t-red-600/20 dark:border-t-red-900/50" />
            </div>
            <div className="relative mt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-red-600">
                    Lì xì / Angpao
                  </p>
                  <p className="text-lg font-bold text-foreground">Chúc mừng năm mới! 🧧</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/70 p-4 dark:bg-white/10">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="mt-0.5 text-2xl font-bold text-red-600">$20.00</p>
                  <p className="text-xs text-muted-foreground">USDC</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 dark:bg-white/10">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-0.5 text-sm font-semibold text-amber-600">Funded ✓</p>
                  <p className="text-xs text-muted-foreground">Hashlock secured</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 dark:bg-white/10">
                <Lock className="h-4 w-4 text-red-600" />
                <p className="text-xs text-muted-foreground">
                  Secured by Soroban hashlock on Stellar
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 dark:bg-white/10">
                <Unlock className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Reveal the secret → funds released on-chain
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div id="how-it-works" className="mt-24">
        <p className="mb-2 text-center text-xs uppercase tracking-widest text-red-600">
          {t('howEyebrow')}
        </p>
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground">{t('howTitle')}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Gift, step: '01', title: t('s1Title'), desc: t('s1Desc') },
            { icon: Send, step: '02', title: t('s2Title'), desc: t('s2Desc') },
            { icon: Sparkles, step: '03', title: t('s3Title'), desc: t('s3Desc') },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-red-100 bg-card p-6 dark:border-red-900/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <Icon className="h-5 w-5 text-red-600" />
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">
                Step {step}
              </p>
              <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/how-it-works">
              {t('ctaSecondary')} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
