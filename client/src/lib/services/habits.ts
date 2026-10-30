import type {
  CreateHabitInput,
  Habit,
  HabitFrequency,
  UpdateHabitInput,
} from "@/types";
import { api } from "../api";

type HabitFilters = {
  frequency?: HabitFrequency;
  generates_task?: boolean;
  include_archived?: boolean;
};

export function createHabit(input: CreateHabitInput) {
  return api<{ message: string; habitId: number }>("/habits", {
    method: "POST",
    body: input,
  });
}

export function getHabits(filters: HabitFilters = {}) {
  const params = new URLSearchParams();
  if (filters.frequency) params.append("frequency", filters.frequency);
  if (filters.generates_task !== undefined)
    params.append("generates_task", filters.generates_task.toString());
  if (filters.include_archived !== undefined)
    params.append("include_archived", filters.include_archived.toString());

  const query = params.toString();
  return api<{ habits: Habit[] }>(`/habits${query ? `?${query}` : ""}`);
}

export function getHabit(id: number) {
  return api<{ habit: Habit }>(`/habits/${id}`);
}

export function updateHabit(id: number, input: UpdateHabitInput) {
  return api<{ message: string }>(`/habits/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function archiveHabit(id: number) {
  return api<{ message: string }>(`/habits/${id}/archive`, { method: "PATCH" });
}

export function restoreHabit(id: number) {
  return api<{ message: string }>(`/habits/${id}/restore`, { method: "PATCH" });
}

export function deleteHabit(id: number) {
  return api<{ message: string }>(`/habits/${id}`, { method: "DELETE" });
}

export function generateTask(id: number, due_date?: string) {
  return api<{ message: string; taskId: number }>(
    `/habits/${id}/generate-task`,
    {
      method: "POST",
      body: due_date ? { due_date } : undefined,
    },
  );
}
