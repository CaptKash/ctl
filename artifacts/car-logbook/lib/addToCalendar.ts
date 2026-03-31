import * as Calendar from "expo-calendar";
import { Alert, Linking, Platform } from "react-native";

export type WritableCalendar = { id: string; title: string; color?: string };

export async function getWritableCalendars(): Promise<WritableCalendar[] | null> {
  if (Platform.OS === "web") return null;

  const { status } = await Calendar.requestCalendarPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Calendar Access Needed",
      "Allow CTL to access your calendar in Settings to save service reminders.",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings(),
        },
      ]
    );
    return null;
  }

  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = all.filter((c) => c.allowsModifications);
  return writable.map((c) => ({
    id: c.id,
    title: c.title,
    color: c.color,
  }));
}

export async function addToCalendar(
  title: string,
  dateStr: string,
  calendarId: string,
  notes?: string
): Promise<boolean> {
  if (Platform.OS === "web") {
    const dt = dateStr.replace(/-/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${dt}/${dt}&details=${encodeURIComponent(notes ?? "")}`;
    window.open(url, "_blank");
    return true;
  }

  const startDate = new Date(`${dateStr}T00:00:00`);
  const endDate = new Date(`${dateStr}T23:59:59`);

  await Calendar.createEventAsync(calendarId, {
    title,
    startDate,
    endDate,
    allDay: true,
    notes: notes ?? "",
  });

  return true;
}
