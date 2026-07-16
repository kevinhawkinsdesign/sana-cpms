// Translations for contact page and other pages
// Supports English (en), French (fr), and Kiswahili (sw)

export type Locale = 'en' | 'fr' | 'sw'
export type TranslationKey = 
  | 'letsChat'
  | 'contactInfo'
  | 'email'
  | 'phone'
  | 'location'

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    letsChat: "Let's chat.",
    contactInfo: "Contact Information",
    email: "info@gokabisa.com",
    phone: "Phone: 6420",
    location: "Kabisa EV House"
  },
  fr: {
    letsChat: "Parlons.",
    contactInfo: "Informations de contact",
    email: "info@gokabisa.com",
    phone: "Téléphone: 6420",
    location: "Kabisa EV House"
  },
  sw: {
    letsChat: "Tuongee.",
    contactInfo: "Maelezo ya Mawasiliano",
    email: "info@gokabisa.com",
    phone: "Simu: 6420",
    location: "Kabisa EV House"
  }
};

// Helper to get locale from URL search params, cookies, or default to 'en'
export const getLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en'
  
  // Check URL search params first
  const searchParams = new URLSearchParams(window.location.search)
  const urlLocale = searchParams.get('lang') || searchParams.get('locale')
  if (urlLocale && ['en', 'fr', 'sw'].includes(urlLocale)) {
    return urlLocale as Locale
  }
  
  // Check localStorage
  let storedLocale: string | null = null;
  try {
    storedLocale = localStorage.getItem('locale');
  } catch (error) {
    // Handle SecurityError (sandboxed iframe) or other localStorage errors
    if (error instanceof DOMException) {
      console.warn('localStorage access denied:', error.message);
    }
  }
  if (storedLocale && ['en', 'fr', 'sw'].includes(storedLocale)) {
    return storedLocale as Locale
  }
  
  // Default to English
  return 'en'
};

export const getTranslation = (locale: Locale, key: TranslationKey): string => {
  return translations[locale]?.[key] || translations.en[key];
};

export type { TranslationKey };

