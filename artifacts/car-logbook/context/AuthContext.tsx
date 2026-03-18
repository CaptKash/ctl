import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

const TOKEN_KEY = "ctl_auth_token";
const USER_KEY = "ctl_auth_user";
const BIOMETRIC_ENABLED_KEY = "ctl_biometric_enabled";

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

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricAvailable: boolean;
  biometricEnrolled: boolean;
  login: (token: string, user: AuthUser, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  biometricAvailable: false,
  biometricEnrolled: false,
  login: async () => {},
  logout: async () => {},
  enableBiometric: async () => {},
  disableBiometric: async () => {},
  authenticateWithBiometric: async () => false,
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== "web") {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricAvailable(compatible && enrolled);
        }

        const bioEnabled = await secureGet(BIOMETRIC_ENABLED_KEY);
        const isBiometricEnabled = bioEnabled === "true" && Platform.OS !== "web";
        setBiometricEnrolled(isBiometricEnabled);

        if (isBiometricEnabled) {
          setIsLoading(false);
          return;
        }

        const storedToken = await secureGet(TOKEN_KEY);
        if (storedToken) {
          const serverUser = await verifyTokenWithServer(storedToken);
          if (serverUser) {
            setToken(storedToken);
            setUser(serverUser);
          } else {
            await Promise.all([
              secureDelete(TOKEN_KEY),
              secureDelete(USER_KEY),
              secureDelete(BIOMETRIC_ENABLED_KEY),
            ]);
            setBiometricEnrolled(false);
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
    if (rememberMe) {
      await Promise.all([
        secureSet(TOKEN_KEY, newToken),
        secureSet(USER_KEY, JSON.stringify(newUser)),
      ]);
    }
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    queryClient.clear();
    await Promise.all([
      secureDelete(TOKEN_KEY),
      secureDelete(USER_KEY),
      secureDelete(BIOMETRIC_ENABLED_KEY),
    ]);
    setToken(null);
    setUser(null);
    setBiometricEnrolled(false);
  };

  const enableBiometric = async () => {
    await secureSet(BIOMETRIC_ENABLED_KEY, "true");
    setBiometricEnrolled(true);
  };

  const disableBiometric = async () => {
    await secureDelete(BIOMETRIC_ENABLED_KEY);
    setBiometricEnrolled(false);
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to CTL",
        cancelLabel: "Cancel",
        fallbackLabel: "Use password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        const storedToken = await secureGet(TOKEN_KEY);
        if (storedToken) {
          const serverUser = await verifyTokenWithServer(storedToken);
          if (serverUser) {
            setToken(storedToken);
            setUser(serverUser);
            return true;
          }
          await Promise.all([
            secureDelete(TOKEN_KEY),
            secureDelete(USER_KEY),
            secureDelete(BIOMETRIC_ENABLED_KEY),
          ]);
          setBiometricEnrolled(false);
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        biometricAvailable,
        biometricEnrolled,
        login,
        logout,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
