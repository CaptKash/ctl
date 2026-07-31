import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather, Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

// Global fetch interceptor — captures every URL the Clerk SDK calls so we can
// see whether signIn.create() reaches the network at all, and which URL it
// targets (proxy or direct Clerk FAPI). Runs once at module load; the
// guard prevents double-wrapping across hot reloads.
if (!(globalThis as any).__clerkFetchIntercepted) {
  (globalThis as any).__clerkFetchIntercepted = true;
  const _origFetch = globalThis.fetch;
  (globalThis as any).fetch = async function (
    input: RequestInfo,
    init?: RequestInit
  ) {
    const url =
      typeof input === "string"
        ? input
        : (input as Request).url ?? "";
    if (
      url.includes("sign_in") ||
      url.includes("__clerk") ||
      url.includes("clerk.dev") ||
      url.includes("frontend-api")
    ) {
      Alert.alert(
        "fetch intercepted",
        `${(init?.method ?? "GET").toUpperCase()} ${url.slice(0, 140)}`
      );
    }
    return _origFetch.call(this, input, init);
  };
}

import { initI18n } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DistanceUnitProvider } from "@/context/DistanceUnitContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { EventRemindersProvider } from "@/context/EventRemindersContext";
import { CountryProvider } from "@/context/CountryContext";
import { SubscriptionProvider, initializeRevenueCat } from "@/lib/revenuecat";
import { OrgProvider } from "@/context/OrgContext";
import { NotificationSyncer } from "@/components/NotificationSyncer";
import { NotificationPermissionPrimer } from "@/components/NotificationPermissionPrimer";
import { PasswordUpgradeModal } from "@/components/PasswordUpgradeModal";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30000 },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="home" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="fleet" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="car/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="car/add" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="report/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="event/add" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="malfunction/add" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="malfunction/log" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="maintenance/add" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="inspection/add" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="inspection/form" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="inspection/type" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="renewal/add" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="renewal/form" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="repair-history" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="account" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="tools" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="fuel" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="service-costs" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="nearby-service" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="fleet-upgrade" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="enterprise-upgrade" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="organization" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="org-activity" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="export" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="feedback" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="select-picker" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: "card" }} />

    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    ...Feather.font,
    ...Ionicons.font,
  });
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  useEffect(() => {
    initI18n().catch((err) => {
      if (__DEV__) console.warn("[i18n] init failed", err);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
      tokenCache={tokenCache}
      proxyUrl={clerkProxyUrl}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <DistanceUnitProvider>
            <CurrencyProvider>
            <EventRemindersProvider>
            <CountryProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AppProvider>
                  <OrgProvider>
                  <SubscriptionProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <NotificationSyncer />
                      <RootLayoutNav />
                      <PasswordUpgradeModal />
                      <NotificationPermissionPrimer />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                  </SubscriptionProvider>
                  </OrgProvider>
                </AppProvider>
              </AuthProvider>
            </QueryClientProvider>
            </CountryProvider>
            </EventRemindersProvider>
            </CurrencyProvider>
            </DistanceUnitProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
