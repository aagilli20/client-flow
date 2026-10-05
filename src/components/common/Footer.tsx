import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  product: [
    { key: 'features', href: '/#features' },
    { key: 'pricing', href: '/pricing' },
    { key: 'start', href: '/auth' },
  ],
};

export default function Footer() {
  const t = useTranslations('Footer');
  const locale = useLocale();
  
  return (
    <footer className="w-full border-t border-border/40 bg-white">
      <div className="container mx-auto px-4 pt-16 pb-5">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="col-span-2">
            <Link href={`/${locale}`} className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                alt="ClientFlow"
                width={32}
                height={32}
                className="h-6 w-auto rounded-full"
              />
              <h2 className="text-xl font-bold text-black">ClientFlow</h2>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              {t('description')}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold">{t('product')}</h3>
            {footerLinks.product.map(({ key, href }) => (
              <Link 
                key={key} 
                href={`/${locale}${href}`}
                className="text-sm text-black/70 hover:text-black"
              >
                {t(key)}
              </Link>
            ))}
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} • ClientFlow. {t('copyright')}
        </div>

      </div>
    </footer>
  );
} 