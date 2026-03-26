import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/context/AuthContext";
import { useEventReminders } from "@/context/EventRemindersContext";
import { apiGet } from "@/hooks/useApi";
import { syncNotifications, type NotificationEvent } from "@/lib/notifications";

export function NotificationSyncer() {
  const { user } = useAuth();
  const { enabled, loading } = useEventReminders();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isSyncing = useRef(false);

  async function sync() {
    if (isSyncing.current || !user) return;
    isSyncing.current = true;
    try {
      const events = await apiGet<NotificationEvent[]>("/maintenance/upcoming");
      await syncNotifications(events);
    } catch {
    } finally {
      isSyncing.current = false;
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!enabled) {
      Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      return;
    }
    if (user) sync();
  }, [user, enabled, loading]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        enabled &&
        !loading
      ) {
        sync();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [user, enabled, loading]);

  return null;
}
