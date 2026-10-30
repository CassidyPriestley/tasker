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
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  generateTask,
  getHabits,
  restoreHabit,
  updateHabit,
} from "@/lib/services/habits";
import type { CreateHabitInput, Habit } from "@/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

// How far back to fetch logs for streaks and the week dots
const LOG_WINDOW_DAYS = 120;

export type HabitWithStats = {
  habit: Habit;
  // "YYYY-MM-DD" days this habit was logged (inside the window)
  loggedDays: Set<string>;
  // id of today's log, or null if not done yet. Needed to undo a check-off.
  todayLogId: number | null;
  streak: number;
};

export function useHabits() {
  // 1. memory
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // habit ids with a check-off in flight, so double taps are ignored
  const pending = useRef(new Set<number>());

  // 2. small functions inside
  const load = useCallback(async () => {
    const now = new Date();
    const today = toYMD(now);
    const windowStart = toYMD(addDays(now, -LOG_WINDOW_DAYS));

    try {
      const { habits: all } = await getHabits({ include_archived: true });

      const withStats = await Promise.all(
        all.map(async (habit) => {
          // archived habits don't show streaks, so skip their logs
          if (habit.archived_at) {
            return {
              habit,
              loggedDays: new Set<string>(),
              todayLogId: null,
              streak: 0,
            };
          }
          const { logs } = await getHabitLogs(habit.id, {
            start: windowStart,
            end: today,
          });
          const loggedDays = new Set(
            logs.map((l) => apiDateToYMD(l.completed_at)),
          );
          const todayLog = logs.find(
            (l) => apiDateToYMD(l.completed_at) === today,
          );
          return {
            habit,
            loggedDays,
            todayLogId: todayLog?.id ?? null,
            streak: currentStreak(habit, loggedDays),
          };
        }),
      );

      setHabits(withStats);
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

  // pull to refresh
  function refresh() {
    setIsRefreshing(true);
    load();
  }

  // create
  async function addHabit(input: CreateHabitInput) {
    await createHabit(input);
    await load();
  }

  // edit. Reload afterwards because changing the days changes the streak.
  async function editHabit(id: number, input: CreateHabitInput) {
    await updateHabit(id, input);
    await load();
  }

  // done today | not done today
  async function toggleToday(habitId: number) {
    const item = habits.find((h) => h.habit.id === habitId);
    if (!item || pending.current.has(habitId)) return;
    pending.current.add(habitId);

    const today = toYMD(new Date());
    const wasDone = item.todayLogId !== null;

    const update = (patch: Partial<HabitWithStats>) =>
      setHabits((list) =>
        list.map((h) => (h.habit.id === habitId ? { ...h, ...patch } : h)),
      );

    // optimistic: flip it right away, use -1 as a placeholder log id
    const loggedDays = new Set(item.loggedDays);
    if (wasDone) loggedDays.delete(today);
    else loggedDays.add(today);
    update({
      loggedDays,
      todayLogId: wasDone ? null : -1,
      streak: currentStreak(item.habit, loggedDays),
    });

    try {
      if (wasDone) {
        await deleteHabitLog(item.todayLogId!);
      } else {
        const { habitLogId } = await createHabitLog(habitId, today);
        update({ todayLogId: habitLogId });
      }
    } catch (err) {
      // server said no: put it back how it was
      update({
        loggedDays: item.loggedDays,
        todayLogId: item.todayLogId,
        streak: item.streak,
      });
      setError(getErrorMessage(err));
    } finally {
      pending.current.delete(habitId);
    }
  }

  // archive hides a habit but keeps its history; restore brings it back
  async function archive(habitId: number) {
    await archiveHabit(habitId);
    await load();
  }

  async function restore(habitId: number) {
    await restoreHabit(habitId);
    await load();
  }

  // delete forever (logs too)
  async function removeHabit(habitId: number) {
    const before = habits;
    setHabits((list) => list.filter((h) => h.habit.id !== habitId));
    try {
      await deleteHabit(habitId);
    } catch (err) {
      setHabits(before);
      setError(getErrorMessage(err));
    }
  }

  // makes a task from the habit (only for habits with generates_task on)
  async function makeTask(habitId: number) {
    await generateTask(habitId, toYMD(new Date()));
  }

  // derived values: worked out from `habits` on every render
  const active = habits.filter((h) => !h.habit.archived_at);
  const archived = habits.filter((h) => h.habit.archived_at);
  const now = new Date();
  const dueToday = active.filter((h) => isScheduledOn(h.habit, now));
  const doneToday = dueToday.filter((h) => h.todayLogId !== null).length;

  // 3. hand them out
  return {
    active,
    archived,
    dueTodayCount: dueToday.length,
    doneToday,
    isLoading,
    isRefreshing,
    error,
    refresh,
    addHabit,
    editHabit,
    toggleToday,
    archive,
    restore,
    removeHabit,
    makeTask,
  };
}
