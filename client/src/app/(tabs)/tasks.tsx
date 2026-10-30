import { FilterChips } from "@/components/tasks/FilterChips";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { radius, space, useTheme } from "@/context/ThemeContext";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Filter = "all" | "todo" | "done";

// Space at the bottom so the floating tab bar doesn't cover anything
const TAB_BAR_SPACE = 110;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Order: unfinished first → earliest due date (no date last) → highest priority
function sortTasks(a: Task, b: Task) {
  const aDone = a.status === "completed";
  const bDone = b.status === "completed";
  if (aDone !== bDone) return aDone ? 1 : -1;

  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }

  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

export default function TasksScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    tasks,
    isLoading,
    isRefreshing,
    error,
    refresh,
    addTask,
    editTask,
    toggleTask,
    removeTask,
  } = useTasks();

  const [filter, setFilter] = useState<Filter>("all");

  // Sheet state. `editing` is null for "new task", or the task being edited.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  // Changing a component's `key` makes React throw it away and build a fresh
  // one, which resets the form's useState values for each open
  const [sheetKey, setSheetKey] = useState(0);

  function openNew() {
    setEditing(null);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  // These are worked out on every render from `tasks`, so they're always
  // in sync. No extra useState needed.
  const todoCount = tasks.filter((t) => t.status !== "completed").length;
  const doneCount = tasks.length - todoCount;

  const visible = tasks
    .filter((t) => {
      if (filter === "todo") return t.status !== "completed";
      if (filter === "done") return t.status === "completed";
      return true;
    })
    .sort(sortTasks);

  const emptyText =
    filter === "done"
      ? "Nothing finished yet."
      : filter === "todo"
        ? "All caught up. ✨"
        : "No tasks yet. Tap + to add one.";

  return (
    <View>
      {/* FlatList is like ScrollView + map(), but only renders the rows that
          are on screen, so it stays fast with long lists */}
      <FlatList
        data={visible}
        keyExtractor={(task) => String(task.id)}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={() => toggleTask(item)}
            onPress={() => openEdit(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + TAB_BAR_SPACE,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.mutedText}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Tasks</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {todoCount === 0
                ? "Nothing left to do"
                : `${todoCount} left to do`}
            </Text>

            <View style={styles.chipRow}>
              <View style={styles.chips}>
                <FilterChips
                  value={filter}
                  onChange={setFilter}
                  options={[
                    {
                      value: "all",
                      label: "All",
                      count: tasks.length,
                      tone: "orange",
                    },
                    {
                      value: "todo",
                      label: "To do",
                      count: todoCount,
                      tone: "orange",
                    },
                    {
                      value: "done",
                      label: "Done",
                      count: doneCount,
                      tone: "orange",
                    },
                  ]}
                />
              </View>
              <Pressable
                onPress={openNew}
                accessibilityRole="button"
                accessibilityLabel="Add task"
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: colors.surfaceRaised,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <Ionicons name="add" size={22} color={glowColors.orange} />
              </Pressable>
            </View>

            {error ? (
              <Pressable onPress={refresh}>
                <Text style={[styles.error, { color: colors.danger }]}>
                  {error} Tap to retry.
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.mutedText} />
          ) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                {emptyText}
              </Text>
            </View>
          )
        }
      />

      <TaskSheet
        key={sheetKey}
        visible={sheetOpen}
        task={editing}
        onClose={() => setSheetOpen(false)}
        onSave={(input) =>
          editing ? editTask(editing.id, input) : addTask(input)
        }
        onDelete={removeTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: space.lg,
  },
  header: {
    gap: space.sm,
    marginBottom: space.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: space.sm,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: space.sm,
  },
  separator: { height: 10 },
  empty: {
    paddingVertical: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: glowColors.orange + "66",
    shadowColor: glowColors.orange,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chips: { flex: 1 },
});
