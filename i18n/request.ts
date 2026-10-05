import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';

export const localeItems = [
    {code: 'en', name: 'English'},
    {code: 'es', name: 'Español'},
];

export const locales = localeItems.map((item) => item.code);
export const defaultLocale = 'es';

export default getRequestConfig(async ({requestLocale}) => {
    // Validate that the incoming `locale` parameter is valid
    const locale: string = await requestLocale ?? "es";
    if (!locales.includes(locale)) notFound();

    return {
        locale,
        messages: ((await import(`./locales/${locale}.json`)) as { default: AbstractIntlMessages }).default
    };
});
