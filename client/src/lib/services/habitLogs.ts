import type { HabitLog } from "@/types";
import { api } from "../api";

type HabitLogFilters = {
  start?: string;
  end?: string;
};

export function createHabitLog(id: number, completed_at?: string) {
  return api<{ message: string; habitLogId: number }>(`/habits/${id}/logs`, {
    method: "POST",
    body: completed_at ? { completed_at } : undefined,
  });
}

export function getHabitLogs(id: number, filters: HabitLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.start) params.append("start", filters.start);
  if (filters.end) params.append("end", filters.end);

  const query = params.toString();
  return api<{ logs: HabitLog[] }>(
    `/habits/${id}/logs${query ? `?${query}` : ""}`,
  );
}

export function habitLogCount(id: number) {
  return api<{ count: number }>(`/habits/${id}/logs/count`);
}

export function deleteHabitLog(id: number) {
  return api<{ message: string }>(`/habits/logs/${id}`, { method: "DELETE" });
}
