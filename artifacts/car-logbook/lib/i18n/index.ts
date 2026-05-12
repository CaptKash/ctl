import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";

import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "ctl.language";
const RTL_LANGUAGES = new Set<SupportedLanguage>(["ar"]);

// Default to English regardless of device locale. Once the user explicitly
// chooses a language (login-screen toggle or Settings), that choice is
// persisted in AsyncStorage and used on every subsequent launch.
function pickInitialLanguage(stored: string | null): SupportedLanguage {
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as SupportedLanguage;
  }
  return "en";
}

export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const lng = pickInitialLanguage(stored);

  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: "v4",
  });

  // Neutralize any leftover native RTL state from earlier app versions
  // that called `I18nManager.forceRTL(true)`. We now drive RTL purely
  // from per-component styles, so the platform must stay LTR.
  try {
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  } catch {
    // No-op on web / unsupported
  }
}

export function isRTLLanguage(lng: string): boolean {
  return RTL_LANGUAGES.has(lng as SupportedLanguage);
}

// Switch language. We deliberately DO NOT call `I18nManager.forceRTL` —
// that API is unreliable in Expo Go (requires a native restart) and forces
// the entire app into auto-flip mode which then double-flips our manual
// styles. Instead, every screen reads `i18n.language` and explicitly
// applies RTL styling (flexDirection: row-reverse, textAlign: right,
// writingDirection: rtl) where appropriate. This makes language switching
// instant and identical between Expo Go, custom dev builds, and prod.
export async function setLanguage(lng: SupportedLanguage): Promise<{ requiresReload: boolean }> {
  await AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => undefined);
  await i18n.changeLanguage(lng);
  return { requiresReload: false };
}

export default i18n;
