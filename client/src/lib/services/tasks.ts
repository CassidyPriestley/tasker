import type {
  CreateTaskInput,
  TaskPriority,
  TaskStatus,
  Task,
  UpdateTaskInput,
} from "@/types";
import { api } from "../api";

type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
};

export function createTask(input: CreateTaskInput) {
  return api<{ message: string; taskId: number }>("/tasks", {
    method: "POST",
    body: input,
  });
}

export function getTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.priority) params.append("priority", filters.priority);

  const query = params.toString();
  return api<{ tasks: Task[] }>(`/tasks${query ? `?${query}` : ""}`);
}

export function getTask(id: number) {
  return api<{ task: Task }>(`/tasks/${id}`);
}

export function updateTask(id: number, input: UpdateTaskInput) {
  return api<{ message: string }>(`/tasks/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function updateTaskStatus(id: number, status: TaskStatus) {
  return api<{ message: string }>(`/tasks/${id}/status`, {
    method: "PUT",
    body: { status },
  });
}

export function deleteTask(id: number) {
  return api<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
}
