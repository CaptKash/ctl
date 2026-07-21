import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const TOKEN_KEY = "ctl_auth_token";
const USER_KEY = "ctl_auth_user";
const REMEMBER_KEY = "ctl_remember_session";
const INSTALL_SENTINEL_KEY = "ctl_install_sentinel";
const INSTALL_SENTINEL_SECURE_KEY = "ctl_install_id";
// Pending name typed at signup. Stashed by the signup screen right before
// it activates the Clerk session, then read+deleted by the sync-user call
// below — the Replit-managed Clerk instance does not accept first/last
// name on signUp.create, so we forward the user's typed name through our
// own server instead.
export const SIGNUP_NAME_KEY = "ctl_pending_signup_name";

// Module-level ref so non-React code (useApi.ts) can call the hook-based
// getToken without needing to be inside a component. Set/cleared by
// AuthProvider whenever the Clerk session changes.
let _clerkGetToken: (() => Promise<string | null>) | null = null;
export function getClerkTokenForApi(): Promise<string | null> {
  return _clerkGetToken ? _clerkGetToken() : Promise.resolve(null);
}

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function verifyTokenWithServer(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

async function syncUserWithServer(clerkSessionToken: string): Promise<AuthUser | null> {
  try {
    // Read any pending signup name. The signup screen stashes the user's
    // typed name here right before activating the Clerk session because
    // the Replit-managed Clerk instance rejects first/last name on
    // signUp.create — so we hand the name to our own server instead.
    // We deliberately delete AFTER the request succeeds so transient
    // network failures (which trigger the outer retry loop) still carry
    // the typed name through; otherwise a single failed attempt would
    // permanently lose the name.
    let pendingName: string | null = null;
    try {
      pendingName = await secureGet(SIGNUP_NAME_KEY);
    } catch { /* non-fatal */ }

    const body: Record<string, string> = {};
    if (pendingName && pendingName.trim()) body.name = pendingName.trim();

    const res = await fetch(`${BASE_URL}/auth/clerk/sync-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clerkSessionToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (__DEV__) {
        const errText = await res.text().catch(() => "(unreadable)");
        console.warn("[syncUserWithServer] failed", res.status, errText);
      }
      return null;
    }
    const data = await res.json();
    // Successful sync — safe to clear the pending name now.
    if (pendingName) {
      try { await secureDelete(SIGNUP_NAME_KEY); } catch { /* non-fatal */ }
    }
    return data.user ?? null;
  } catch {
    return null;
  }
}

async function isFreshInstall(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const sentinelPath = `${FileSystem.documentDirectory}${INSTALL_SENTINEL_KEY}`;
    const info = await FileSystem.getInfoAsync(sentinelPath);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(sentinelPath, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
  passwordUpgradeRequired?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Legacy: used by the old register/login flows. After Phase 3, the login
  // and signup screens drive auth through Clerk directly and the sync-user
  // effect populates `user` automatically — but this remains for any caller
  // that still hands us a server-issued JWT.
  login: (token: string, user: AuthUser, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

async function secureGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch { /* ignore */ }
}

async function secureDelete(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch { /* ignore */ }
}

async function clearLegacyTokens(): Promise<void> {
  await Promise.all([
    secureDelete(TOKEN_KEY),
    secureDelete(USER_KEY),
    secureDelete(REMEMBER_KEY),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const clerk = useClerk();
  const { isLoaded: clerkLoaded, isSignedIn, getToken: getClerkToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootDone, setBootDone] = useState(false);

  // Keep the module-level ref in sync with the hook-based getToken.
  useEffect(() => {
    _clerkGetToken = isSignedIn ? getClerkToken : null;
    return () => { _clerkGetToken = null; };
  }, [isSignedIn, getClerkToken]);

  // Stable ref so the sync effect can call getClerkToken without including
  // it in the dependency array (Clerk recreates the function on every render
  // during session restore, which would otherwise cancel/restart the sync
  // in a tight loop and leave initialSyncPending stuck on true).
  const getClerkTokenRef = useRef(getClerkToken);
  useEffect(() => { getClerkTokenRef.current = getClerkToken; }, [getClerkToken]);

  const [initialSyncPending, setInitialSyncPending] = useState(false);

  // Track which Clerk user id we've already synced to avoid hammering
  // /auth/clerk/sync-user on every re-render of the Clerk hook.
  const syncedClerkIdRef = useRef<string | null>(null);

  // ── Boot: handle fresh-install reset and the legacy-JWT grace path ──────
  // Runs once when Clerk has loaded. If a Clerk session exists, the second
  // effect below takes over. Otherwise we look for a legacy JWT in
  // SecureStore (for users who haven't re-signed-in since the Clerk build
  // shipped) and validate it via /auth/me.
  useEffect(() => {
    if (!clerkLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const freshInstall = await isFreshInstall();
        if (freshInstall) {
          await Promise.all([
            clearLegacyTokens(),
            secureDelete(INSTALL_SENTINEL_SECURE_KEY),
          ]);
          // Also boot Clerk back to a clean state so a fresh install never
          // inherits a session from a prior tenant on the same device.
          if (isSignedIn) {
            try { await clerk.signOut(); } catch { /* ignore */ }
          }
          if (!cancelled) setBootDone(true);
          return;
        }

        // Clerk session present → defer to the Clerk-driven sync effect.
        if (isSignedIn) {
          if (!cancelled) setBootDone(true);
          return;
        }

        // No Clerk session — try legacy JWT path (Phase 4 will remove this).
        const storedToken = await secureGet(TOKEN_KEY);
        if (!storedToken) {
          if (!cancelled) setBootDone(true);
          return;
        }
        const remember = await secureGet(REMEMBER_KEY);
        if (remember === "0") {
          await clearLegacyTokens();
          if (!cancelled) setBootDone(true);
          return;
        }

        const storedUserStr = await secureGet(USER_KEY);
        const storedUser: AuthUser | null = storedUserStr ? JSON.parse(storedUserStr) : null;

        const serverUser = await verifyTokenWithServer(storedToken);
        if (cancelled) return;
        if (serverUser) {
          setToken(storedToken);
          setUser({
            ...serverUser,
            isAdmin: serverUser.isAdmin ?? storedUser?.isAdmin,
            passwordUpgradeRequired:
              serverUser.passwordUpgradeRequired ?? storedUser?.passwordUpgradeRequired,
          });
        } else {
          await clearLegacyTokens();
        }
      } catch { /* ignore */ }
      finally {
        if (!cancelled) setBootDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, [clerkLoaded, isSignedIn, clerk]);

  // ── Clerk-driven sync ────────────────────────────────────────────────────
  // Whenever Clerk reports a signed-in user, mirror them into our local
  // database via /auth/clerk/sync-user and capture the numeric local id.
  // This is the load-bearing call: lib/revenuecat.tsx uses `user.id` (the
  // local numeric id, NOT the Clerk id) as the RevenueCat appUserID, which
  // is how the 71 prod users keep their entitlements through the migration.
  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn || !clerkUser) {
      syncedClerkIdRef.current = null;
      setUser((prev) => (prev ? null : prev));
      setToken((prev) => (prev ? null : prev));
      setInitialSyncPending(false);
      return;
    }
    if (syncedClerkIdRef.current === clerkUser.id) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setInitialSyncPending(true);

    const attemptSync = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      let succeeded = false;
      try {
        const sessionToken = await Promise.race([
          getClerkTokenRef.current(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Clerk token timeout after 30s")), 30000)
          ),
        ]);
        if (!sessionToken) throw new Error("Clerk token not ready yet");
        const synced = await syncUserWithServer(sessionToken);
        if (cancelled) return;
        if (synced) {
          syncedClerkIdRef.current = clerkUser.id;
          setUser(synced);
          setToken(sessionToken);
          await clearLegacyTokens();
          succeeded = true;
        }
      } catch (err) {
        if (__DEV__) console.warn("[Clerk sync] attempt", attempt, "failed:", err);
      } finally {
        if (attempt === 0 && !cancelled) setInitialSyncPending(false);
      }
      if (!succeeded && !cancelled && attempt < 5) {
        const delay = 1000 * Math.pow(2, attempt);
        retryTimer = setTimeout(() => { void attemptSync(attempt + 1); }, delay);
      }
    };

    void attemptSync(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      setInitialSyncPending(false);
    };
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  // ── Legacy compatibility shim ────────────────────────────────────────────
  // Pre-Phase-3 callers handed us a server-issued JWT after /auth/register
  // or /auth/login. After Phase 3 the login/signup screens drive auth
  // through Clerk directly, but this remains for any straggling caller.
  const login = async (newToken: string, newUser: AuthUser, rememberMe = true) => {
    queryClient.clear();
    await Promise.all([
      secureSet(TOKEN_KEY, newToken),
      secureSet(USER_KEY, JSON.stringify(newUser)),
      secureSet(REMEMBER_KEY, rememberMe ? "1" : "0"),
    ]);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    queryClient.clear();
    // Always clear local state first so the UI flips immediately.
    setToken(null);
    setUser(null);
    syncedClerkIdRef.current = null;
    await clearLegacyTokens();
    // Sign out of Clerk last (it can be slow on a flaky network).
    if (isSignedIn) {
      try { await clerk.signOut(); } catch { /* ignore — local state already cleared */ }
    }
  };

  const updateUser = async (updatedUser: AuthUser) => {
    setUser(updatedUser);
    // Only mirror to legacy SecureStore if a legacy session is still in use.
    // Once on Clerk, sync-user is the source of truth on the next render.
    if (!isSignedIn) {
      await secureSet(USER_KEY, JSON.stringify(updatedUser));
    }
  };

  const isLoading = !clerkLoaded || !bootDone || initialSyncPending;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
