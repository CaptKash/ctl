import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
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

  applyRTLForLanguage(lng);
}

export function isRTLLanguage(lng: string): boolean {
  return RTL_LANGUAGES.has(lng as SupportedLanguage);
}

function applyRTLForLanguage(lng: string): void {
  const shouldBeRTL = isRTLLanguage(lng);
  if (I18nManager.isRTL !== shouldBeRTL) {
    try {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    } catch {
      // No-op on web / unsupported
    }
  }
}

export async function setLanguage(lng: SupportedLanguage): Promise<{ requiresReload: boolean }> {
  await AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => undefined);
  const wasRTL = I18nManager.isRTL;
  await i18n.changeLanguage(lng);
  applyRTLForLanguage(lng);
  const isNowRTL = isRTLLanguage(lng);
  return { requiresReload: wasRTL !== isNowRTL };
}

export default i18n;
