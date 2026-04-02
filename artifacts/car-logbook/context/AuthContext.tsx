import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const freshInstall = await isFreshInstall();
        if (freshInstall) {
          await Promise.all([
            secureDelete(TOKEN_KEY),
            secureDelete(USER_KEY),
            secureDelete(REMEMBER_KEY),
            secureDelete(INSTALL_SENTINEL_SECURE_KEY),
          ]);
          return;
        }

        const storedToken = await secureGet(TOKEN_KEY);
        if (storedToken) {
          const remember = await secureGet(REMEMBER_KEY);
          if (remember === "0") {
            await Promise.all([
              secureDelete(TOKEN_KEY),
              secureDelete(USER_KEY),
              secureDelete(REMEMBER_KEY),
            ]);
            return;
          }

          const storedUserStr = await secureGet(USER_KEY);
          const storedUser: AuthUser | null = storedUserStr ? JSON.parse(storedUserStr) : null;

          const serverUser = await verifyTokenWithServer(storedToken);
          if (serverUser) {
            const mergedUser: AuthUser = {
              ...serverUser,
              isAdmin: serverUser.isAdmin ?? storedUser?.isAdmin,
            };
            setToken(storedToken);
            setUser(mergedUser);
          } else {
            await Promise.all([
              secureDelete(TOKEN_KEY),
              secureDelete(USER_KEY),
              secureDelete(REMEMBER_KEY),
            ]);
          }
        }
      } catch { /* ignore */ }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);

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
    await Promise.all([
      secureDelete(TOKEN_KEY),
      secureDelete(USER_KEY),
      secureDelete(REMEMBER_KEY),
    ]);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedUser: AuthUser) => {
    setUser(updatedUser);
    await secureSet(USER_KEY, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
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
