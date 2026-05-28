import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import de from './locales/de/translation.json';

export const supportedLanguages = ['en', 'de'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const STORAGE_KEY = 'language';

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            de: { translation: de },
        },
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: STORAGE_KEY,
            caches: ['localStorage'],
        },
    });

export default i18n;

