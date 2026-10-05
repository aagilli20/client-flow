import { useTranslations } from 'next-intl';
import { BarChart3, CircleDashed, Send, Share2, UserCheck, Users } from 'lucide-react';

const features = [
  { icon: Users, key: 'prospects' },
  { icon: CircleDashed, key: 'rings' },
  { icon: UserCheck, key: 'team' },
  { icon: Share2, key: 'social' },
  { icon: BarChart3, key: 'month' },
  { icon: Send, key: 'report' },
] as const;

export default function Feature() {
  const t = useTranslations('Feature');

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t('title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('description')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, key }) => (
            <div key={key} className="bg-gray-50/50 p-6 rounded-2xl border">
              <Icon className="h-6 w-6 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t(key)}</h3>
              <p className="text-muted-foreground">{t(`${key}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
