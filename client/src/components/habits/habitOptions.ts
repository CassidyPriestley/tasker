import { glowColors } from "@/constants/glowColors";
import { DAY_NAMES } from "@/lib/dates";
import type { Habit } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// Colors a habit can pick. Saved to the backend as the hex code.
export const HABIT_COLORS = [
  glowColors.blue,
  glowColors.green,
  glowColors.pink,
  glowColors.orange,
  glowColors.neutral,
];

// Icons a habit can pick. Any Ionicons name works here.
export const HABIT_ICONS: IconName[] = [
  "water",
  "barbell",
  "book",
  "walk",
  "bed",
  "leaf",
  "musical-notes",
  "heart",
  "sunny",
  "code-slash",
  "cafe",
  "sparkles",
];

export const DEFAULT_ICON: IconName = "sparkles";

// Only use a saved icon if Ionicons knows it, otherwise fall back
export function habitIcon(habit: Habit): IconName {
  const name = habit.icon as IconName | null;
  return name && name in Ionicons.glyphMap ? name : DEFAULT_ICON;
}

export function habitColor(habit: Habit) {
  return habit.color ?? glowColors.blue;
}

// "Every day", "Weekdays", "Weekends" or "Mon · Wed · Fri"
export function scheduleLabel(habit: Habit) {
  const days = habit.days ?? [];
  if (habit.frequency === "daily" || days.length === 7) return "Every day";

  const sorted = DAY_NAMES.filter((d) => days.includes(d));
  const key = sorted.join(",");
  if (key === "monday,tuesday,wednesday,thursday,friday") return "Weekdays";
  if (key === "sunday,saturday") return "Weekends";

  return sorted
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
    .join(" · ");
}
