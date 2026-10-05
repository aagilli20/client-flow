import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Hero() {
  const t = useTranslations('Hero');
  const locale = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-gray-50/50">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-orange-600">ClientFlow</p>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 max-w-3xl">
        {t('title')}
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-[800px] mb-8">
        {t('description')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button asChild size="lg" className="min-w-[160px]">
          <Link href={`/${locale}/auth`}>{t('action')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="min-w-[160px]">
          <Link href={`/${locale}/auth`}>{t('secondary')}</Link>
        </Button>
      </div>
    </div>
  );
}
