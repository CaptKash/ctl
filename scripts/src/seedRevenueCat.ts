import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "CTL - Car Technical Log";

const APP_STORE_APP_NAME = "CTL iOS";
const APP_STORE_BUNDLE_ID = "com.ctl.carlogbook";
const PLAY_STORE_APP_NAME = "CTL Android";
const PLAY_STORE_PACKAGE_NAME = "com.ctl.carlogbook";

const ENTITLEMENT_IDENTIFIER = "fleet";
const ENTITLEMENT_DISPLAY_NAME = "CTL Fleet";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "CTL Fleet Offering";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

const PLANS = [
  {
    packageIdentifier: "$rc_monthly",
    packageDisplayName: "Monthly",
    productIdentifier: "ctl_fleet_monthly",
    playStoreIdentifier: "ctl_fleet_monthly:monthly",
    displayName: "CTL Fleet Monthly",
    title: "CTL Fleet Monthly",
    type: "subscription" as const,
    duration: "P1M" as const,
    prices: [{ amount_micros: 2990000, currency: "USD" }],
  },
  {
    packageIdentifier: "$rc_annual",
    packageDisplayName: "Annual",
    productIdentifier: "ctl_fleet_annual",
    playStoreIdentifier: "ctl_fleet_annual:annual",
    displayName: "CTL Fleet Annual",
    title: "CTL Fleet Annual",
    type: "subscription" as const,
    duration: "P1Y" as const,
    prices: [{ amount_micros: 24990000, currency: "USD" }],
  },
  {
    packageIdentifier: "$rc_lifetime",
    packageDisplayName: "Lifetime",
    productIdentifier: "ctl_fleet_lifetime",
    playStoreIdentifier: "ctl_fleet_lifetime",
    displayName: "CTL Fleet Lifetime",
    title: "CTL Fleet Lifetime",
    type: "non_consumable" as const,
    duration: undefined,
    prices: [{ amount_micros: 19990000, currency: "USD" }],
  },
];

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });

  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);

  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error: createProjectError } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (createProjectError) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listAppsError || !apps || apps.items.length === 0) {
    throw new Error("No apps found");
  }

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test Store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    plan: (typeof PLANS)[0],
    isTestStore: boolean
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: storeIdentifier,
      app_id: targetApp.id,
      type: plan.type,
      display_name: plan.displayName,
    };

    if (isTestStore) {
      if (plan.type === "subscription" && plan.duration) {
        body.subscription = { duration: plan.duration };
      }
      body.title = plan.title;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const productIds: string[] = [];

  for (const plan of PLANS) {
    const testProduct = await ensureProduct(testStoreApp, `Test/${plan.packageDisplayName}`, plan.productIdentifier, plan, true);
    const iosProduct = await ensureProduct(appStoreApp, `iOS/${plan.packageDisplayName}`, plan.productIdentifier, plan, false);
    const androidProduct = await ensureProduct(playStoreApp, `Android/${plan.packageDisplayName}`, plan.playStoreIdentifier, plan, false);

    productIds.push(testProduct.id, iosProduct.id, androidProduct.id);

    console.log(`Adding test store prices for ${plan.packageDisplayName}...`);
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: plan.prices },
    });

    if (priceError) {
      if (typeof priceError === "object" && "type" in priceError && priceError["type"] === "resource_already_exists") {
        console.log(`Test store prices already exist for ${plan.packageDisplayName}`);
      } else {
        throw new Error(`Failed to add test store prices for ${plan.packageDisplayName}`);
      }
    } else {
      console.log(`Added test store prices for ${plan.packageDisplayName}`);
    }
  }

  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEnt.id);
    entitlement = newEnt;
  }

  const { error: attachEntError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: productIds },
  });
  if (attachEntError) {
    if (attachEntError.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (const plan of PLANS) {
    const { data: testProd } = await (async () => {
      const p = existingProducts.items?.find(
        (p) => p.store_identifier === plan.productIdentifier && p.app_id === testStoreApp!.id
      );
      if (p) return { data: p };
      const { data: freshProducts } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
      return { data: freshProducts?.items?.find((p) => p.store_identifier === plan.productIdentifier && p.app_id === testStoreApp!.id)! };
    })();
    const { data: iosProd } = await (async () => {
      const p = existingProducts.items?.find(
        (p) => p.store_identifier === plan.productIdentifier && p.app_id === appStoreApp!.id
      );
      if (p) return { data: p };
      const { data: freshProducts } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
      return { data: freshProducts?.items?.find((p) => p.store_identifier === plan.productIdentifier && p.app_id === appStoreApp!.id)! };
    })();
    const { data: androidProd } = await (async () => {
      const p = existingProducts.items?.find(
        (p) => p.store_identifier === plan.playStoreIdentifier && p.app_id === playStoreApp!.id
      );
      if (p) return { data: p };
      const { data: freshProducts } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
      return { data: freshProducts?.items?.find((p) => p.store_identifier === plan.playStoreIdentifier && p.app_id === playStoreApp!.id)! };
    })();

    let pkg: Package | undefined = existingPackages.items?.find((p) => p.lookup_key === plan.packageIdentifier);
    if (pkg) {
      console.log(`Package already exists (${plan.packageDisplayName}):`, pkg.id);
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: plan.packageIdentifier, display_name: plan.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package ${plan.packageDisplayName}`);
      console.log(`Created package (${plan.packageDisplayName}):`, newPkg.id);
      pkg = newPkg;
    }

    const { error: attachPkgError } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProd.id, eligibility_criteria: "all" },
          { product_id: iosProd.id, eligibility_criteria: "all" },
          { product_id: androidProd.id, eligibility_criteria: "all" },
        ],
      },
    });

    if (attachPkgError) {
      if (attachPkgError.type === "unprocessable_entity_error") {
        console.log(`Package ${plan.packageDisplayName} already has products attached`);
      } else {
        throw new Error(`Failed to attach products to package ${plan.packageDisplayName}`);
      }
    } else {
      console.log(`Attached products to package (${plan.packageDisplayName})`);
    }
  }

  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testStoreApp.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement Identifier:", ENTITLEMENT_IDENTIFIER);
  console.log("Public API Keys - Test Store:", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Public API Keys - App Store:", iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Public API Keys - Play Store:", androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
