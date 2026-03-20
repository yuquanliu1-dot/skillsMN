/**
 * i18n Configuration
 *
 * Internationalization setup using i18next and react-i18next
 * Supports English (en) and Simplified Chinese (zh-CN)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import zhCNTranslation from './locales/zh-CN/translation.json';

// Available languages
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
] as const;

export type LanguageCode = typeof availableLanguages[number]['code'];

// Translation resources
const resources = {
  en: {
    translation: enTranslation,
  },
  'zh-CN': {
    translation: zhCNTranslation,
  },
};

// Default language (fallback)
const defaultLanguage: LanguageCode = 'en';

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    supportedLngs: availableLanguages.map(l => l.code),

    // Detection options - only use localStorage, default to English
    detection: {
      // Only check localStorage, don't follow system language
      order: ['localStorage'],
      // Keys for localStorage
      lookupLocalStorage: 'skillsMN-language',
      // Cache user language in localStorage
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React options
    react: {
      useSuspense: false, // Disable suspense for better SSR support
    },
  });

/**
 * Change language and persist to settings
 */
export async function changeLanguage(languageCode: LanguageCode): Promise<void> {
  await i18n.changeLanguage(languageCode);

  // Persist to localStorage
  localStorage.setItem('skillsMN-language', languageCode);

  // Also save to Electron settings if available
  if (window.electronAPI?.saveConfig) {
    try {
      await window.electronAPI.saveConfig({ language: languageCode });
    } catch (error) {
      console.warn('Failed to save language to settings:', error);
    }
  }
}

/**
 * Initialize language from Electron config
 * Call this after the app loads the config
 */
export async function initializeLanguageFromConfig(language?: string): Promise<void> {
  if (language && availableLanguages.some(l => l.code === language)) {
    // Only change if different from current
    if (i18n.language !== language) {
      await i18n.changeLanguage(language);
      localStorage.setItem('skillsMN-language', language);
    }
  }
}

/**
 * Get current language code
 */
export function getCurrentLanguage(): LanguageCode {
  const currentLang = i18n.language;
  // Check if it's a supported language
  if (availableLanguages.some(l => l.code === currentLang)) {
    return currentLang as LanguageCode;
  }
  // Handle language codes like 'en-US' -> 'en'
  const baseLang = currentLang.split('-')[0];
  if (availableLanguages.some(l => l.code === baseLang)) {
    return baseLang as LanguageCode;
  }
  return defaultLanguage;
}

/**
 * Get language display name
 */
export function getLanguageName(code: LanguageCode): string {
  const lang = availableLanguages.find(l => l.code === code);
  return lang?.nativeName || code;
}

export default i18n;
