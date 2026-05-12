import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DevSettings, I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";

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

// Switch language and, if the writing direction flipped (LTR↔RTL), reload
// the JS bundle automatically so the user never sees a "restart required"
// alert. React Native applies `I18nManager.forceRTL` only on bundle reload,
// so we drive that ourselves: `Updates.reloadAsync()` in production builds,
// `DevSettings.reload()` in dev / Expo Go.
export async function setLanguage(lng: SupportedLanguage): Promise<{ requiresReload: boolean }> {
  await AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => undefined);
  const wasRTL = I18nManager.isRTL;
  await i18n.changeLanguage(lng);
  applyRTLForLanguage(lng);
  const isNowRTL = isRTLLanguage(lng);
  const requiresReload = wasRTL !== isNowRTL;

  if (requiresReload && Platform.OS !== "web") {
    // Tiny delay so the caller's UI (haptic, button state) settles before
    // the bundle tears down.
    setTimeout(() => {
      try {
        if (__DEV__ && typeof DevSettings?.reload === "function") {
          DevSettings.reload();
        } else {
          Updates.reloadAsync().catch(() => undefined);
        }
      } catch {
        // No-op — worst case the user closes/reopens manually.
      }
    }, 150);
  }

  return { requiresReload };
}

export default i18n;
