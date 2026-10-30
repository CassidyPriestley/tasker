import {
  addDays,
  apiDateToYMD,
  currentStreak,
  isScheduledOn,
  toYMD,
} from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import {
  createHabitLog,
  deleteHabitLog,
  getHabitLogs,
} from "@/lib/services/habitLogs";
import { getHabits } from "@/lib/services/habits";
import { getTasks, updateTaskStatus } from "@/lib/services/tasks";
import type { Habit, Task } from "@/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

// How far back to fetch logs when working out streaks
const STREAK_WINDOW_DAYS = 90;

export type TodayHabit = {
  habit: Habit;
  // id of today's log, or null if not done yet. Needed to undo a check-off.
  todayLogId: number | null;
  streak: number;
};

export type TodayTask = Task & { overdue: boolean };

export function useToday() {
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // habit/task ids with a request in flight, so double taps are ignored
  const pending = useRef(new Set<string>());

  const load = useCallback(async () => {
    const now = new Date();
    const today = toYMD(now);
    const windowStart = toYMD(addDays(now, -STREAK_WINDOW_DAYS));

    try {
      const [{ habits: allHabits }, { tasks: allTasks }] = await Promise.all([
        getHabits(),
        getTasks(),
      ]);

      const scheduled = allHabits.filter((h) => isScheduledOn(h, now));

      const withLogs = await Promise.all(
        scheduled.map(async (habit) => {
          const { logs } = await getHabitLogs(habit.id, {
            start: windowStart,
            end: today,
          });
          const days = new Set(logs.map((l) => apiDateToYMD(l.completed_at)));
          const todayLog = logs.find(
            (l) => apiDateToYMD(l.completed_at) === today,
          );
          return {
            habit,
            todayLogId: todayLog?.id ?? null,
            streak: currentStreak(habit, days),
          };
        }),
      );

      // due today or earlier; finished ones stay only if they were due today
      const todaysTasks = allTasks
        .filter((t) => t.due_date)
        .map((t) => {
          const due = apiDateToYMD(t.due_date!);
          return { ...t, due, overdue: due < today && t.status !== "completed" };
        })
        .filter(
          (t) => t.due === today || (t.due < today && t.status !== "completed"),
        )
        .sort((a, b) => Number(b.overdue) - Number(a.overdue))
        .map(({ due, ...t }) => t);

      setHabits(withLogs);
      setTasks(todaysTasks);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // refetch whenever the tab comes back into view
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function refresh() {
    setIsRefreshing(true);
    load();
  }

  async function toggleHabit(habitId: number) {
    const key = `h${habitId}`;
    const item = habits.find((h) => h.habit.id === habitId);
    if (!item || pending.current.has(key)) return;
    pending.current.add(key);

    const wasDone = item.todayLogId !== null;
    const update = (patch: Partial<TodayHabit>) =>
      setHabits((list) =>
        list.map((h) => (h.habit.id === habitId ? { ...h, ...patch } : h)),
      );

    // optimistic: flip it right away, use -1 as a placeholder log id
    update({
      todayLogId: wasDone ? null : -1,
      streak: Math.max(0, item.streak + (wasDone ? -1 : 1)),
    });

    try {
      if (wasDone) {
        await deleteHabitLog(item.todayLogId!);
      } else {
        const { habitLogId } = await createHabitLog(habitId, toYMD(new Date()));
        update({ todayLogId: habitLogId });
      }
    } catch (err) {
      update({ todayLogId: item.todayLogId, streak: item.streak });
      setError(getErrorMessage(err));
    } finally {
      pending.current.delete(key);
    }
  }

  async function toggleTask(taskId: number) {
    const key = `t${taskId}`;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || pending.current.has(key)) return;
    pending.current.add(key);

    const next = task.status === "completed" ? "pending" : "completed";
    const setStatus = (status: Task["status"]) =>
      setTasks((list) =>
        list.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );

    setStatus(next);
    try {
      await updateTaskStatus(taskId, next);
    } catch (err) {
      setStatus(task.status);
      setError(getErrorMessage(err));
    } finally {
      pending.current.delete(key);
    }
  }

  const done =
    habits.filter((h) => h.todayLogId !== null).length +
    tasks.filter((t) => t.status === "completed").length;
  const total = habits.length + tasks.length;

  return {
    habits,
    tasks,
    done,
    total,
    isLoading,
    isRefreshing,
    error,
    refresh,
    toggleHabit,
    toggleTask,
  };
}
