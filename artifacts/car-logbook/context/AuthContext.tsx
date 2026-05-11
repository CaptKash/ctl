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
    const res = await fetch(`${BASE_URL}/auth/clerk/sync-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clerkSessionToken}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json();
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
  const [syncing, setSyncing] = useState(false);

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
      // Signed out: drop local state. We do NOT clear legacy SecureStore
      // here so the boot effect can still validate it on next cold start
      // for users who never explicitly logged out.
      syncedClerkIdRef.current = null;
      setUser((prev) => (prev ? null : prev));
      setToken((prev) => (prev ? null : prev));
      return;
    }
    if (syncedClerkIdRef.current === clerkUser.id) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // Retry with bounded exponential backoff so a flaky network at app
    // open doesn't leave a Clerk-signed-in user stuck with no local
    // user record (and therefore no RevenueCat login). 5 attempts at
    // 1s, 2s, 4s, 8s, 16s — total ~30s — then give up until the next
    // dependency change re-triggers the effect.
    const attemptSync = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      setSyncing(true);
      let succeeded = false;
      try {
        const sessionToken = await getClerkToken();
        if (!sessionToken) return;
        const synced = await syncUserWithServer(sessionToken);
        if (cancelled) return;
        if (synced) {
          syncedClerkIdRef.current = clerkUser.id;
          setUser(synced);
          setToken(sessionToken);
          // Once on Clerk, the legacy SecureStore JWT is no longer the
          // source of truth — flush it so we never accidentally hand a
          // stale legacy token to the API on a future cold start.
          await clearLegacyTokens();
          succeeded = true;
        }
      } catch { /* fall through to retry */ }
      finally {
        if (!cancelled) setSyncing(false);
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
    };
  }, [clerkLoaded, isSignedIn, clerkUser, getClerkToken]);

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

  const isLoading = !clerkLoaded || !bootDone || syncing;

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
