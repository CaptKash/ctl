/**
 * Clerk Expo's pre-created headless singleton ignores the browser proxyUrl prop.
 * Register before ClerkProvider loads it; keep the SDK's token-cache hooks intact.
 */
type ClerkRequest = { url?: URL; method?: string };
type ClerkInstance = {
  frontendApi: string;
  __unstable__onBeforeRequest?: (callback: (request: ClerkRequest) => unknown) => void;
  __unstable__onAfterResponse?: (
    callback: (request: ClerkRequest, response?: { status: number; payload?: unknown }) => unknown
  ) => void;
};

const configuredInstances = new WeakSet<ClerkInstance>();
type EnvironmentStatus = "not_required" | "checking" | "production" | "blocked";
let environmentStatus: EnvironmentStatus = "not_required";
const listeners = new Set<() => void>();
export const getNativeClerkEnvironmentStatus = () => environmentStatus;
export function subscribeNativeClerkEnvironment(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publishStatus(status: EnvironmentStatus) {
  environmentStatus = status;
  listeners.forEach(listener => listener());
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function installNativeClerkProxy(
  clerk: ClerkInstance,
  proxyUrl: string,
) {
  if (configuredInstances.has(clerk)) return;
  if (
    typeof clerk.__unstable__onBeforeRequest !== "function" ||
    typeof clerk.__unstable__onAfterResponse !== "function"
  ) {
    throw new Error("This Clerk SDK does not support the required native proxy request hook.");
  }

  const proxy = new URL(proxyUrl);
  if (
    proxy.protocol !== "https:" ||
    proxy.username || proxy.password || proxy.search || proxy.hash ||
    proxy.pathname.replace(/\/$/, "") !== "/api/__clerk"
  ) {
    throw new Error("Native Clerk requires an HTTPS /api/__clerk proxy URL.");
  }
  const frontend = new URL(`https://${clerk.frontendApi}`);
  const prefix = proxy.pathname.replace(/\/$/, "");
  let verifiedProduction = false;
  publishStatus("checking");

  clerk.__unstable__onAfterResponse((request, response) => {
    if (
      request.url?.origin !== proxy.origin ||
      request.url.pathname !== `${prefix}/v1/environment`
    ) return;
    const payload = record(response?.payload);
    const display = record(payload.display_config ?? record(payload.response).display_config);
    verifiedProduction = response?.status === 200 &&
      display.instance_environment_type === "production";
    publishStatus(verifiedProduction ? "production" : "blocked");
  });

  clerk.__unstable__onBeforeRequest((request) => {
    const url = request.url;
    // Only Clerk FAPI calls: never reroute OAuth provider or unrelated API URLs.
    if (!url || url.origin !== frontend.origin || !url.pathname.startsWith("/v1/")) return;

    // Mutate the existing URL so method, body, headers, query parameters, and
    // Clerk Expo's authorization/_is_native hooks are preserved unchanged.
    url.protocol = proxy.protocol;
    url.host = proxy.host;
    url.pathname = `${prefix}${url.pathname}`;
    if (
      !["GET", "HEAD", "OPTIONS"].includes((request.method ?? "GET").toUpperCase()) &&
      !verifiedProduction
    ) {
      throw new Error("Production authentication environment has not been verified.");
    }
  });
  configuredInstances.add(clerk);
}
