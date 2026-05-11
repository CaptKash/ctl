import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform, NativeModules, TurboModuleRegistry } from "react-native";
import Purchases, { PurchasesOfferings, CustomerInfo, PurchasesPackage, PACKAGE_TYPE, STOREKIT_VERSION } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "fleet";

export const FREE_CAR_LIMIT = 2;

export const DEV_MOCK_PACKAGES: PurchasesPackage[] = [
  {
    identifier: "$rc_monthly",
    packageType: PACKAGE_TYPE.MONTHLY,
    product: {
      identifier: "ctl_fleet_monthly",
      description: "CTL Fleet Monthly",
      title: "Monthly",
      price: 2.99,
      priceString: "$2.99",
      currencyCode: "USD",
      introPrice: null,
      discounts: [],
    },
    offeringIdentifier: "default",
  } as unknown as PurchasesPackage,
  {
    identifier: "$rc_annual",
    packageType: PACKAGE_TYPE.ANNUAL,
    product: {
      identifier: "ctl_fleet_annual",
      description: "CTL Fleet Annual",
      title: "Annual",
      price: 19.99,
      priceString: "$19.99",
      currencyCode: "USD",
      introPrice: null,
      discounts: [],
    },
    offeringIdentifier: "default",
  } as unknown as PurchasesPackage,
  {
    identifier: "$rc_lifetime",
    packageType: PACKAGE_TYPE.LIFETIME,
    product: {
      identifier: "ctl_fleet_lifetime",
      description: "CTL Fleet Lifetime",
      title: "Lifetime",
      price: 24.99,
      priceString: "$24.99",
      currencyCode: "USD",
      introPrice: null,
      discounts: [],
    },
    offeringIdentifier: "default",
  } as unknown as PurchasesPackage,
];

function getRevenueCatApiKey() {
  if (Platform.OS === "web") return REVENUECAT_TEST_API_KEY ?? "";
  if (__DEV__) return REVENUECAT_TEST_API_KEY ?? "";
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY ?? "";
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY ?? "";
  return REVENUECAT_TEST_API_KEY ?? "";
}

let _configured = false;
let _initError: string | null = null;

export function getRevenueCatDiagnostics(): string {
  const legacyModule = NativeModules.RNPurchases;
  const turboModule = (TurboModuleRegistry as any)?.get?.("RNPurchases");
  const apiKey = getRevenueCatApiKey();
  return [
    `NativeModules.RNPurchases: ${legacyModule ? "OK" : "NULL"}`,
    `TurboModuleRegistry: ${turboModule ? "OK" : "NULL"}`,
    `API key prefix: ${apiKey ? apiKey.substring(0, 10) + "..." : "MISSING"}`,
    `Configured: ${_configured}`,
    `Init error: ${_initError ?? "none"}`,
  ].join(" | ");
}

export function initializeRevenueCat() {
  if (Platform.OS === "web") return;
  if (_configured) return;

  const legacyModule = NativeModules.RNPurchases;
  const turboModule = (TurboModuleRegistry as any)?.get?.("RNPurchases");
  console.log(`[RevenueCat] NativeModules.RNPurchases: ${legacyModule ? "OK" : "NULL"}`);
  console.log(`[RevenueCat] TurboModuleRegistry: ${turboModule ? "OK" : "NULL"}`);

  try {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      _initError = "NO_API_KEY";
      console.warn("[RevenueCat] No API key found, skipping initialization");
      return;
    }
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey, storeKitVersion: STOREKIT_VERSION.STOREKIT_1 });
    _configured = true;
    _initError = null;
    console.log("[RevenueCat] Configured OK:", apiKey.substring(0, 10) + "...");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("already")) {
      _configured = true;
      _initError = null;
    } else {
      _initError = msg.substring(0, 120);
      console.warn("[RevenueCat] Init failed:", msg);
    }
  }
}

function useSubscriptionContext() {
  const { user } = useAuth();

  // Track the RevenueCat user ID only after logIn/logOut has actually resolved,
  // so the customerInfo query never runs against the wrong RC identity.
  const [rcReadyUserId, setRcReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    initializeRevenueCat();
    if (user?.id) {
      const id = String(user.id);
      Purchases.logIn(id)
        .then(() => setRcReadyUserId(id))
        .catch(() => setRcReadyUserId(id)); // still allow query on error — RC may already be right
    } else {
      Purchases.logOut()
        .then(() => setRcReadyUserId(null))
        .catch(() => setRcReadyUserId(null));
    }
  }, [user?.id]);

  const customerInfoQuery = useQuery<CustomerInfo>({
    queryKey: ["revenuecat", "customer-info", rcReadyUserId],
    queryFn: async () => {
      initializeRevenueCat();
      return Purchases.getCustomerInfo();
    },
    staleTime: 60 * 1000,
    retry: 2,
    enabled: Platform.OS !== "web" && rcReadyUserId !== null,
  });

  const offeringsQuery = useQuery<PurchasesOfferings>({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      initializeRevenueCat();
      return Purchases.getOfferings();
    },
    staleTime: 300 * 1000,
    retry: 3,
    enabled: Platform.OS !== "web",
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isAdmin = user?.isAdmin === true;

  const isFleet =
    isAdmin ||
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  const realPackages: PurchasesPackage[] = (() => {
    const data = offeringsQuery.data;
    if (!data) return [];
    if ((data.current?.availablePackages?.length ?? 0) > 0) return data.current!.availablePackages;
    for (const offering of Object.values(data.all ?? {})) {
      if ((offering.availablePackages?.length ?? 0) > 0) return offering.availablePackages;
    }
    return [];
  })();

  const offeringsLoaded = !offeringsQuery.isLoading;
  const offeringsFailed = offeringsLoaded && (offeringsQuery.isError || realPackages.length === 0);
  const usingMockPackages = offeringsFailed;

  const diagnostics = Platform.OS !== "web" ? getRevenueCatDiagnostics() : null;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isFleet,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    offeringsFailed,
    usingMockPackages,
    FREE_CAR_LIMIT,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: customerInfoQuery.refetch,
    refetchOfferings: offeringsQuery.refetch,
    mockPackages: DEV_MOCK_PACKAGES,
    realPackages,
    diagnostics,
    offeringsError: offeringsQuery.error
      ? (offeringsQuery.error instanceof Error ? offeringsQuery.error.message : String(offeringsQuery.error))
      : null,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
