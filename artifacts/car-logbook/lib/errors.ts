export function isUserCancelled(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { userCancelled?: boolean }).userCancelled);
}

export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const body = (e as { body?: unknown }).body;
    if (body && typeof body === "object") {
      const bodyError = (body as { error?: unknown }).error;
      if (typeof bodyError === "string" && bodyError) return bodyError;
    }
    const message = (e as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
