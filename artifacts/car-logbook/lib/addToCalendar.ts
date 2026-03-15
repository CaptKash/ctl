import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

export async function addToCalendar(
  title: string,
  dateStr: string,
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

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission needed",
      "Allow calendar access so CTL can save this reminder to your calendar."
    );
    return false;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable =
    calendars.find((c) => c.allowsModifications && c.source?.isLocalAccount) ??
    calendars.find((c) => c.allowsModifications) ??
    calendars[0];

  if (!writable) {
    Alert.alert("No calendar found", "Could not find a writable calendar on this device.");
    return false;
  }

  const startDate = new Date(`${dateStr}T00:00:00`);
  const endDate = new Date(`${dateStr}T23:59:59`);

  await Calendar.createEventAsync(writable.id, {
    title,
    startDate,
    endDate,
    allDay: true,
    notes: notes ?? "",
  });

  return true;
}
