import AppError from "./AppError";

export const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export const daysToMask = (days: number[]): number => {
  return days.reduce((mask, day) => {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new AppError(
        `Invalid day index: ${day}. Must be 0-6 (Sun-Sat)`,
        400,
      );
    }
    return mask | (1 << day);
  }, 0);
};

export const dayNamesToMask = (days: DayName[]): number => {
  return daysToMask(days.map((d) => DAY_NAMES.indexOf(d)));
};

export const maskToDays = (mask: number): number[] => {
  const days: number[] = [];
  for (let day = 0; day < 7; day++) {
    if (mask & (1 << day)) {
      days.push(day);
    }
  }
  return days;
};

export const maskToDayNames = (mask: number): DayName[] => {
  return maskToDays(mask).map((day) => DAY_NAMES[day]);
};

export const maskIncludesDay = (
  mask: number,
  day: Date | number | DayName,
): boolean => {
  let dayIndex: number;
  if (day instanceof Date) {
    dayIndex = day.getDay();
  } else if (typeof day === "number") {
    dayIndex = day;
  } else {
    dayIndex = DAY_NAMES.indexOf(day);
  }
  return (mask & (1 << dayIndex)) !== 0;
};

export const isScheduledToday = (mask: number): boolean => {
  return maskIncludesDay(mask, new Date());
};
