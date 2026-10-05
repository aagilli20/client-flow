'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

export function initialsOf(name?: string | null, email?: string | null) {
  if (name) return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return email?.[0]?.toUpperCase() ?? '?';
}

/** Navegación lateral (≥ md). En mobile se usa MobileNav. */
export default function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const { user, signOut, mode } = useAuth();

  const isActive = (href: string) => pathname.startsWith(`/${locale}${href}`);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="border-b px-5 py-4">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
          ClientFlow
        </Link>
      </div>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-orange-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t px-3 py-3">
        {mode === 'demo' && (
          <p className="mb-1 rounded-lg bg-orange-50 px-3 py-2 text-[11px] leading-snug text-orange-800">
            Modo demo: los datos se guardan en este navegador.
          </p>
        )}
        <Link
          href={`/${locale}/settings`}
          aria-current={isActive('/settings') ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
            isActive('/settings') ? 'bg-accent text-foreground' : 'text-muted-foreground',
          )}
        >
          <Settings className="h-[18px] w-[18px]" /> Configuración
        </Link>
        <button
          onClick={async () => {
            await signOut();
            router.replace(`/${locale}/auth`);
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
        </button>
        <div className="mt-1 flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
            {initialsOf(user?.displayName, user?.email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{user?.displayName ?? 'Usuario'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
