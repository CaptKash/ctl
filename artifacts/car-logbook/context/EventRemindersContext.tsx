import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REMINDERS_KEY = "ctl_event_reminders";

type EventRemindersContextType = {
  enabled: boolean;
  setEnabled: (v: boolean) => Promise<void>;
  loading: boolean;
};

const EventRemindersContext = createContext<EventRemindersContextType>({
  enabled: false,
  setEnabled: async () => {},
  loading: true,
});

async function loadEnabled(): Promise<boolean> {
  try {
    const val = Platform.OS === "web"
      ? localStorage.getItem(REMINDERS_KEY)
      : await SecureStore.getItemAsync(REMINDERS_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

async function saveEnabled(v: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(REMINDERS_KEY, String(v));
    } else {
      await SecureStore.setItemAsync(REMINDERS_KEY, String(v));
    }
  } catch {}
}

export function EventRemindersProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnabled().then((v) => {
      setEnabledState(v);
      setLoading(false);
    });
  }, []);

  const setEnabled = async (v: boolean) => {
    setEnabledState(v);
    await saveEnabled(v);
  };

  return (
    <EventRemindersContext.Provider value={{ enabled, setEnabled, loading }}>
      {children}
    </EventRemindersContext.Provider>
  );
}

export function useEventReminders() {
  return useContext(EventRemindersContext);
}
