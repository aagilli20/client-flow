'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { Spinner } from './shared';
import { MobileHeader, MobileTabBar } from './MobileNav';
import Sidebar from './Sidebar';
import { ToastProvider } from './Toast';

/** Protege las rutas privadas (guard en cliente: la seguridad real está en Firestore Rules). */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!loading && !user) router.replace(`/${locale}/auth`);
  }, [loading, user, router, locale]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" role="status" aria-label="Cargando">
        <Spinner className="h-7 w-7 text-muted-foreground" />
      </div>
    );
  }

  return (
    <DataProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-gray-50/70">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileHeader />
            <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">
              {children}
            </main>
          </div>
          <MobileTabBar />
        </div>
      </ToastProvider>
    </DataProvider>
  );
}
