import { Gift } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/ui/components/shared/language-switcher';
import { ThemeToggle } from '@/ui/components/shared/theme-toggle';
import { AccountChip } from './account-chip';

export async function SiteHeader() {
  const t = await getTranslations('Nav');
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-red-600">
          <Gift className="h-5 w-5" />
          <span className="text-base font-extrabold tracking-tight">Angpao</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-4 text-sm md:flex">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            {t('dashboard')}
          </Link>
          <Link href="/wallet" className="text-muted-foreground hover:text-foreground">
            {t('wallet')}
          </Link>
          <Link href="/envelopes" className="text-muted-foreground hover:text-foreground">
            {t('onchain')}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <AccountChip />
        </div>
      </div>
    </header>
  );
}
