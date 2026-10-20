import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getClerkInstance } from "@clerk/clerk-expo";
import { getClerkTokenForApi } from "../context/AuthContext";

const TOKEN_KEY = "ctl_auth_token";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function getLegacyToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Prefer Clerk session token (Phase 3+); fall back to legacy SecureStore JWT
// for users who haven't migrated yet on this device. The Phase 1 dual-auth
// middleware on the API server accepts either credential.
async function getToken(): Promise<string | null> {
  // Primary: hook-based getToken from AuthContext (works on both native + web,
  // and is the same function used by the sync effect).
  try {
    const hookToken = await getClerkTokenForApi();
    if (hookToken) return hookToken;
  } catch {
    // Not yet set — fall through.
  }
  // Secondary: global Clerk instance (native-reliable fallback).
  try {
    const clerkToken = await getClerkInstance().session?.getToken();
    if (clerkToken) return clerkToken;
  } catch {
    // Clerk not initialized (very early boot) — fall through to legacy.
  }
  return getLegacyToken();
}

async function buildHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseError(res: Response): Promise<Error> {
  try {
    const json = await res.json();
    return new Error(json?.error ?? `API error: ${res.status}`);
  } catch {
    return new Error(`API error: ${res.status}`);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE", headers });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
