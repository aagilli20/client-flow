'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

export function MobileHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 font-bold tracking-tight">
        <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
        ClientFlow
      </Link>
      <Link
        href={`/${locale}/settings`}
        aria-label="Configuración"
        aria-current={pathname.startsWith(`/${locale}/settings`) ? 'page' : undefined}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
}

/** Barra de pestañas inferior (< md). */
export function MobileTabBar() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(`/${locale}${item.href}`);
        return (
          <Link
            key={item.href}
            href={`/${locale}${item.href}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <item.icon className={cn('h-5 w-5', active && 'text-orange-500')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
