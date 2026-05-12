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

// Switch language. When the writing direction flips (LTR↔RTL) we try to
// reload the JS bundle so `I18nManager.forceRTL` actually re-applies the
// new layout. In a production / custom-dev build `Updates.reloadAsync()`
// does the right thing. In Expo Go this is unreliable — RN's RTL flip
// requires a true native restart — so the caller should also surface the
// bilingual `common.restartRequired*` alert telling the user to close and
// reopen the app.
export async function setLanguage(lng: SupportedLanguage): Promise<{ requiresReload: boolean }> {
  await AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => undefined);
  const wasRTL = I18nManager.isRTL;
  await i18n.changeLanguage(lng);
  applyRTLForLanguage(lng);
  const isNowRTL = isRTLLanguage(lng);
  const requiresReload = wasRTL !== isNowRTL;

  if (requiresReload && Platform.OS !== "web") {
    // Best-effort programmatic reload. Works on production / custom dev
    // builds; in Expo Go the user will still need to manually close and
    // reopen the app, which is why callers also show the bilingual alert.
    setTimeout(() => {
      try {
        Updates.reloadAsync().catch(() => {
          if (__DEV__ && typeof DevSettings?.reload === "function") {
            DevSettings.reload();
          }
        });
      } catch {
        // No-op
      }
    }, 1500);
  }

  return { requiresReload };
}

export default i18n;
