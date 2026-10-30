import {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTask,
} from "@/lib/services/tasks";
import { getErrorMessage } from "@/lib/errors";
import { CreateTaskInput, Task } from "@/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useTasks() {
  // 1. memory
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Small functions inside:
  const load = useCallback(async () => {
    try {
      const data = await getTasks();
      setTasks(data.tasks);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // pull refresh
  function refresh() {
    setIsRefreshing(true);
    load();
  }

  // create
  async function addTask(input: CreateTaskInput) {
    await createTask(input);
    await load();
  }

  // edit title, notes, priority, due date
  async function editTask(id: number, input: CreateTaskInput) {
    await updateTask(id, input);
    setTasks((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              title: input.title,
              task_description: input.task_description || null,
              priority: input.priority ?? t.priority,
              due_date: input.due_date ?? t.due_date,
            }
          : t,
      ),
    );
  }

  // done | not done
  async function toggleTask(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";

    setTasks((list) =>
      list.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTaskStatus(task.id, newStatus);
    } catch (error) {
      // server rejects: return it how it was
      setTasks((list) =>
        list.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
      setError(getErrorMessage(error));
    }
  }

  // delete task
  async function removeTask(task: Task) {
    // store the list to remember in case we need to undo
    const before = tasks;
    setTasks((list) => list.filter((t) => t.id !== task.id));

    try {
      await deleteTask(task.id);
    } catch (error) {
      setTasks(before); // where we undo
      setError(getErrorMessage(error));
    }
  }

  return {
    tasks,
    isLoading,
    isRefreshing,
    error,
    refresh,
    addTask,
    editTask,
    toggleTask,
    removeTask,
  };
}
