import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
import Purchases, { PurchasesOfferings, CustomerInfo, PurchasesPackage, PACKAGE_TYPE } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
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
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY ?? "";
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY ?? "";
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY ?? "";
  return REVENUECAT_TEST_API_KEY ?? "";
}

export function initializeRevenueCat() {
  try {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.warn("RevenueCat: API key not found, skipping initialization");
      return;
    }
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("[RevenueCat] Configured");
  } catch (e) {
    console.warn("[RevenueCat] Initialization failed:", e);
  }
}

function decodeJwtIsAdmin(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

function useSubscriptionContext() {
  const { user, token } = useAuth();

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (user?.id) {
      Purchases.logIn(String(user.id)).catch(() => {});
    } else {
      Purchases.logOut().catch(() => {});
    }
  }, [user?.id]);

  const customerInfoQuery = useQuery<CustomerInfo>({
    queryKey: ["revenuecat", "customer-info", user?.id ?? null],
    queryFn: async () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    retry: 2,
  });

  const offeringsQuery = useQuery<PurchasesOfferings>({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
    retry: 2,
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

  const isAdmin = user?.isAdmin === true || decodeJwtIsAdmin(token);

  const isFleet =
    isAdmin ||
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  const offeringsLoaded = !offeringsQuery.isLoading;
  const offeringsFailed = offeringsLoaded && (offeringsQuery.isError || (offeringsQuery.data?.current?.availablePackages?.length ?? 0) === 0);
  const usingMockPackages = offeringsFailed;

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
