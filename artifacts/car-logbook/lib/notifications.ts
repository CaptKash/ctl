import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// TODO(notifications-v2): The primer (NotificationPermissionPrimer.tsx) promises
// reminders for: registration renewal, insurance renewal, upcoming inspections,
// warranty expiry, and next-part-change due dates. Today this module only fires
// for the unified "events" stream from /maintenance/upcoming, so as long as a
// car has those rows entered, the primer is honest. Extensive work to do later:
//   1. Add per-event-TYPE notification copy (currently every event uses the
//      same "Due in Nd · {car}" template) so the user sees "🛡️ Insurance
//      renewal due in 7d" vs "🔧 Brake pads due in 1d", etc.
//   2. Surface warranty as a first-class event type on the server (today it's
//      lumped into generic events; needs its own type + UI for entry).
//   3. Per-category opt-in toggles in Settings (e.g. mute warranty pings but
//      keep insurance pings) — requires schema for per-type preferences.
//   4. Push (APNs/FCM) channel for server-driven nudges that don't depend on
//      the app being opened weekly to refresh the local schedule.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export type NotificationEvent = {
  id: number;
  carId: number;
  type: string;
  description: string;
  nextDueDate: string;
  nextDueMileage: number | null;
  make: string;
  model: string;
  year: number;
};

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyEmoji(days: number): string {
  if (days < 0) return "🔴";
  if (days <= 7) return "🟠";
  if (days <= 30) return "🟡";
  return "🟢";
}

function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function eventLine(event: NotificationEvent): string {
  const days = daysFromNow(event.nextDueDate);
  const emoji = urgencyEmoji(days);
  const car = `${event.year} ${event.make} ${event.model}`;
  return `${emoji} ${event.type} · ${car} · ${urgencyLabel(days)}`;
}

function nextSundayAt9AM(): Date {
  const now = new Date();
  const daysUntilSunday = now.getDay() === 0 ? 7 : 7 - now.getDay();
  const next = new Date(now);
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(9, 0, 0, 0);
  return next;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function syncNotifications(events: NotificationEvent[]): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const tasks: Promise<string>[] = [];

  for (const event of events) {
    const dueDate = new Date(event.nextDueDate);
    dueDate.setHours(9, 0, 0, 0);

    for (const threshold of [30, 7, 1] as const) {
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - threshold);
      triggerDate.setHours(9, 0, 0, 0);

      if (triggerDate <= now) continue;

      const days = daysFromNow(event.nextDueDate);
      const emoji = urgencyEmoji(days);
      const car = `${event.year} ${event.make} ${event.model}`;
      const body =
        threshold === 1
          ? `Due tomorrow · ${car}`
          : `Due in ${threshold} days · ${car}`;

      tasks.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: `${emoji} ${event.type}`,
            body,
            data: { eventId: event.id, carId: event.carId },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        })
      );
    }
  }

  const sundayTrigger = nextSundayAt9AM();
  const total = events.length;

  if (total === 0) {
    tasks.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ CTL Weekly — All caught up!",
          body: "No upcoming service events. Keep up the great maintenance.",
          data: { type: "weekly_digest" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sundayTrigger },
      })
    );
  } else {
    const sorted = [...events].sort(
      (a, b) => daysFromNow(a.nextDueDate) - daysFromNow(b.nextDueDate)
    );
    const top5 = sorted.slice(0, 5);
    const lines = top5.map(eventLine).join("\n");
    const extra = total > 5 ? `\n+${total - 5} more` : "";

    tasks.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: `📅 CTL Weekly — ${total} upcoming event${total !== 1 ? "s" : ""}`,
          body: lines + extra,
          data: { type: "weekly_digest" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sundayTrigger },
      })
    );
  }

  await Promise.allSettled(tasks);
}
