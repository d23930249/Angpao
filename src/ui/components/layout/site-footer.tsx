import { Link } from '@/i18n/routing';

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
        <span>APAC Stellar Hackathon</span>
        <nav className="flex items-center gap-4">
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/stats" className="hover:text-foreground">
            Stats
          </Link>
        </nav>
      </div>
    </footer>
  );
}
