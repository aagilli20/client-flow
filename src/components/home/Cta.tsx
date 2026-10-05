import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Cta() {
  const t = useTranslations('Cta');
  const locale = useLocale();

  return (
    <section className="py-20 bg-gray-50/50">
      <div className="container px-4 mx-auto text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">{t('title')}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{t('description')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="min-w-[160px]">
              <Link href={`/${locale}/auth`}>{t('primaryAction')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-[160px]">
              <Link href={`/${locale}/auth`}>{t('secondaryAction')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
