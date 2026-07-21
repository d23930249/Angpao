import type { ReactNode } from 'react';
import { SiteFooter } from '@/ui/components/layout/site-footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
