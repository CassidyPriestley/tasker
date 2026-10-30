import type { DayName, Habit } from "@/types";

export const DAY_NAMES: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// "YYYY-MM-DD" in the phone's own timezone (toISOString would use UTC and
// flip to tomorrow in the evening)
export function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// MySQL DATE columns come back as "2026-10-28T04:00:00.000Z" (local midnight
// in UTC), so turn them back into the local calendar day
export function apiDateToYMD(value: string) {
  if (!value.includes("T")) return value.slice(0, 10);
  return toYMD(new Date(value));
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isScheduledOn(habit: Habit, date: Date) {
  if (habit.frequency === "daily") return true;
  // daily habits come back with days: null, so guard against it
  return (habit.days ?? []).includes(DAY_NAMES[date.getDay()]);
}

/**
 * Counts scheduled days in a row that were logged, walking back from today.
 * Today not being done yet doesn't break the streak.
 */
export function currentStreak(habit: Habit, loggedDays: Set<string>) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const day = addDays(today, -i);
    if (!isScheduledOn(habit, day)) continue;

    if (loggedDays.has(toYMD(day))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

// Sunday-first week containing `date`
export function weekOf(date: Date) {
  const start = addDays(date, -date.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
