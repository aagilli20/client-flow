import React from "react";
import { cn } from "@/lib/utils";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import {NextIntlClientProvider, useLocale, useMessages} from 'next-intl';
import { GoogleAnalytics } from '@next/third-parties/google'
import { env } from "@/env";

import { AuthProvider } from "@/contexts/AuthContext";

export default function LocaleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = useLocale();
    const messages = useMessages();
    return (
    <html lang={locale} className={cn(GeistSans.variable, GeistMono.variable, "scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100")}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
        {env.GA_ID && <GoogleAnalytics gaId={env.GA_ID} />}
        </body>
    </html>
    );
}
