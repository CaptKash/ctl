import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  listApps,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Entitlement,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "CTL - Car Technical Log";
const OFFERING_IDENTIFIER = "enterprise";
const OFFERING_DISPLAY_NAME = "CTL Enterprise Offering";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

const ENTITLEMENTS = [
  { lookupKey: "enterprise_10", displayName: "CTL Enterprise 10 Seats" },
  { lookupKey: "enterprise_50", displayName: "CTL Enterprise 50 Seats" },
  { lookupKey: "enterprise_unlimited", displayName: "CTL Enterprise Unlimited" },
];

const PLANS = [
  {
    entitlement: "enterprise_10",
    packageIdentifier: "ctl_enterprise_10_monthly",
    packageDisplayName: "Enterprise 10 Monthly",
    productIdentifier: "ctl_enterprise_10_monthly",
    playStoreIdentifier: "ctl_enterprise_10_monthly:monthly",
    displayName: "CTL Enterprise 10 Monthly",
    duration: "P1M" as const,
    prices: [{ amount_micros: 29990000, currency: "USD" }],
  },
  {
    entitlement: "enterprise_10",
    packageIdentifier: "ctl_enterprise_10_annual",
    packageDisplayName: "Enterprise 10 Annual",
    productIdentifier: "ctl_enterprise_10_annual",
    playStoreIdentifier: "ctl_enterprise_10_annual:annual",
    displayName: "CTL Enterprise 10 Annual",
    duration: "P1Y" as const,
    prices: [{ amount_micros: 299990000, currency: "USD" }],
  },
  {
    entitlement: "enterprise_50",
    packageIdentifier: "ctl_enterprise_50_monthly",
    packageDisplayName: "Enterprise 50 Monthly",
    productIdentifier: "ctl_enterprise_50_monthly",
    playStoreIdentifier: "ctl_enterprise_50_monthly:monthly",
    displayName: "CTL Enterprise 50 Monthly",
    duration: "P1M" as const,
    prices: [{ amount_micros: 99990000, currency: "USD" }],
  },
  {
    entitlement: "enterprise_50",
    packageIdentifier: "ctl_enterprise_50_annual",
    packageDisplayName: "Enterprise 50 Annual",
    productIdentifier: "ctl_enterprise_50_annual",
    playStoreIdentifier: "ctl_enterprise_50_annual:annual",
    displayName: "CTL Enterprise 50 Annual",
    duration: "P1Y" as const,
    prices: [{ amount_micros: 999990000, currency: "USD" }],
  },
  {
    entitlement: "enterprise_unlimited",
    packageIdentifier: "ctl_enterprise_unlimited_monthly",
    packageDisplayName: "Enterprise Unlimited Monthly",
    productIdentifier: "ctl_enterprise_unlimited_monthly",
    playStoreIdentifier: "ctl_enterprise_unlimited_monthly:monthly",
    displayName: "CTL Enterprise Unlimited Monthly",
    duration: "P1M" as const,
    prices: [{ amount_micros: 199990000, currency: "USD" }],
  },
  {
    entitlement: "enterprise_unlimited",
    packageIdentifier: "ctl_enterprise_unlimited_annual",
    packageDisplayName: "Enterprise Unlimited Annual",
    productIdentifier: "ctl_enterprise_unlimited_annual",
    playStoreIdentifier: "ctl_enterprise_unlimited_annual:annual",
    displayName: "CTL Enterprise Unlimited Annual",
    duration: "P1Y" as const,
    prices: [{ amount_micros: 1999990000, currency: "USD" }],
  },
];

async function seedEnterpriseOffering() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects, error: listProjectsError } = await listProjects({ client, query: { limit: 20 } });
  if (listProjectsError || !projects) throw new Error("Failed to list projects");
  const project = projects.items?.find((p) => p.name === PROJECT_NAME);
  if (!project) throw new Error(`Project "${PROJECT_NAME}" not found`);
  console.log("Project:", project.id);

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps) throw new Error("Failed to list apps");

  const testStoreApp = apps.items.find((a) => a.type === "test_store");
  const appStoreApp = apps.items.find((a) => a.type === "app_store");
  const playStoreApp = apps.items.find((a) => a.type === "play_store");
  if (!testStoreApp || !appStoreApp || !playStoreApp) throw new Error("Missing one or more apps (test/app/play store)");
  console.log("Apps:", { test: testStoreApp.id, ios: appStoreApp.id, android: playStoreApp.id });

  const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await listProducts({
      client,
      path: { project_id: project.id },
      query: { limit: 200 },
    });
    if (error || !data) throw new Error("Failed to list products");
    return data.items ?? [];
  };
  let allProducts = await fetchProducts();

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    plan: (typeof PLANS)[0],
    isTestStore: boolean
  ): Promise<Product> => {
    const existing = allProducts.find(
      (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: storeIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: `${plan.displayName}${isTestStore ? "" : targetApp.type === "app_store" ? " (iOS)" : " (Android)"}`,
    };
    if (isTestStore) {
      body.subscription = { duration: plan.duration };
      body.title = plan.displayName;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
    console.log(`Created ${label} product:`, created.id);
    allProducts.push(created);
    return created;
  };

  const productIdsByEntitlement: Record<string, string[]> = {};
  const packageProducts: Record<string, { test: Product; ios: Product; android: Product }> = {};

  for (const plan of PLANS) {
    const testProduct = await ensureProduct(testStoreApp, `Test/${plan.packageDisplayName}`, plan.productIdentifier, plan, true);
    const iosProduct = await ensureProduct(appStoreApp, `iOS/${plan.packageDisplayName}`, plan.productIdentifier, plan, false);
    const androidProduct = await ensureProduct(playStoreApp, `Android/${plan.packageDisplayName}`, plan.playStoreIdentifier, plan, false);

    (productIdsByEntitlement[plan.entitlement] ??= []).push(testProduct.id, iosProduct.id, androidProduct.id);
    packageProducts[plan.packageIdentifier] = { test: testProduct, ios: iosProduct, android: androidProduct };

    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: plan.prices },
    });
    if (priceError) {
      if (typeof priceError === "object" && "type" in priceError && priceError["type"] === "resource_already_exists") {
        console.log(`Test store prices already exist for ${plan.packageDisplayName}`);
      } else {
        throw new Error(`Failed to add test store prices for ${plan.packageDisplayName}: ${JSON.stringify(priceError)}`);
      }
    } else {
      console.log(`Added test store prices for ${plan.packageDisplayName}`);
    }
  }

  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 50 },
  });
  if (listEntitlementsError || !existingEntitlements) throw new Error("Failed to list entitlements");

  for (const ent of ENTITLEMENTS) {
    let entitlement: Entitlement | undefined = existingEntitlements.items?.find((e) => e.lookup_key === ent.lookupKey);
    if (entitlement) {
      console.log(`Entitlement ${ent.lookupKey} already exists:`, entitlement.id);
    } else {
      const { data: newEnt, error } = await createEntitlement({
        client,
        path: { project_id: project.id },
        body: { lookup_key: ent.lookupKey, display_name: ent.displayName },
      });
      if (error) throw new Error(`Failed to create entitlement ${ent.lookupKey}: ${JSON.stringify(error)}`);
      console.log(`Created entitlement ${ent.lookupKey}:`, newEnt.id);
      entitlement = newEnt;
    }

    const { error: attachEntError } = await attachProductsToEntitlement({
      client,
      path: { project_id: project.id, entitlement_id: entitlement.id },
      body: { product_ids: productIdsByEntitlement[ent.lookupKey] ?? [] },
    });
    if (attachEntError) {
      if (attachEntError.type === "unprocessable_entity_error") {
        console.log(`Products already attached to entitlement ${ent.lookupKey}`);
      } else {
        throw new Error(`Failed to attach products to entitlement ${ent.lookupKey}: ${JSON.stringify(attachEntError)}`);
      }
    } else {
      console.log(`Attached products to entitlement ${ent.lookupKey}`);
    }
  }

  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError || !existingOfferings) throw new Error("Failed to list offerings");

  let offering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (offering) {
    console.log("Offering already exists:", offering.id);
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error(`Failed to create offering: ${JSON.stringify(error)}`);
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }
  // NOTE: deliberately NOT setting is_current — "default" (Fleet) must stay current.

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError || !existingPackages) throw new Error("Failed to list packages");

  for (const plan of PLANS) {
    let pkg = existingPackages.items?.find((p) => p.lookup_key === plan.packageIdentifier);
    if (pkg) {
      console.log(`Package already exists (${plan.packageDisplayName}):`, pkg.id);
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: plan.packageIdentifier, display_name: plan.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package ${plan.packageDisplayName}: ${JSON.stringify(error)}`);
      console.log(`Created package (${plan.packageDisplayName}):`, newPkg.id);
      pkg = newPkg;
    }

    const prods = packageProducts[plan.packageIdentifier];
    const { error: attachPkgError } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: prods.test.id, eligibility_criteria: "all" },
          { product_id: prods.ios.id, eligibility_criteria: "all" },
          { product_id: prods.android.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgError) {
      if (attachPkgError.type === "unprocessable_entity_error") {
        console.log(`Package ${plan.packageDisplayName} already has products attached`);
      } else {
        throw new Error(`Failed to attach products to package ${plan.packageDisplayName}: ${JSON.stringify(attachPkgError)}`);
      }
    } else {
      console.log(`Attached products to package (${plan.packageDisplayName})`);
    }
  }

  console.log("\n====================");
  console.log("Enterprise offering setup complete!");
  console.log("Offering:", OFFERING_IDENTIFIER, "(default offering left as current)");
  console.log("Entitlements:", ENTITLEMENTS.map((e) => e.lookupKey).join(", "));
  console.log("Packages:", PLANS.map((p) => p.packageIdentifier).join(", "));
  console.log("====================\n");
}

seedEnterpriseOffering().catch((e) => {
  console.error(e);
  process.exit(1);
});
