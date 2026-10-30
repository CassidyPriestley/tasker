import { HabitCard } from "@/components/habits/HabitCard";
import { HabitSheet } from "@/components/habits/HabitSheet";
import { FilterChips } from "@/components/tasks/FilterChips";
import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { radius, space, useTheme } from "@/context/ThemeContext";
import { useHabits } from "@/hooks/use-habits";
import { isScheduledOn } from "@/lib/dates";
import type { Habit } from "@/types";
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

type Filter = "active" | "archived";

// Space at the bottom so the floating tab bar doesn't cover anything
const TAB_BAR_SPACE = 110;

export default function HabitsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    active,
    archived,
    dueTodayCount,
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
  } = useHabits();

  const [filter, setFilter] = useState<Filter>("active");

  // Sheet state. `editing` is null for "new habit", or the habit being edited.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  function openNew() {
    setEditing(null);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditing(habit);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  // Due today first, then the rest; each group keeps the server's order
  const now = new Date();
  const visible =
    filter === "archived"
      ? archived
      : [...active].sort(
          (a, b) =>
            Number(isScheduledOn(b.habit, now)) -
            Number(isScheduledOn(a.habit, now)),
        );

  const subtitle =
    dueTodayCount === 0
      ? "Nothing scheduled today"
      : doneToday === dueTodayCount
        ? `All ${dueTodayCount} done today ✨`
        : `${doneToday} of ${dueTodayCount} done today`;

  return (
    <View>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.habit.id)}
        renderItem={({ item }) => (
          <HabitCard
            item={item}
            onToggle={() => toggleToday(item.habit.id)}
            onPress={() => openEdit(item.habit)}
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
            <Text style={[styles.title, { color: colors.text }]}>Habits</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {isLoading ? "Loading…" : subtitle}
            </Text>

            <View style={styles.chipRow}>
              <View style={styles.chips}>
                <FilterChips
                  value={filter}
                  onChange={setFilter}
                  options={[
                    {
                      value: "active",
                      label: "Active",
                      count: active.length,
                      tone: "blue",
                    },
                    {
                      value: "archived",
                      label: "Archived",
                      count: archived.length,
                      tone: "blue",
                    },
                  ]}
                />
              </View>
              <Pressable
                onPress={openNew}
                accessibilityRole="button"
                accessibilityLabel="Add habit"
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: colors.surfaceRaised,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <Ionicons name="add" size={28} color={glowColors.blue} />
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
                {filter === "archived"
                  ? "No archived habits."
                  : "No habits yet. Tap + to start one."}
              </Text>
            </View>
          )
        }
      />

      <HabitSheet
        key={sheetKey}
        visible={sheetOpen}
        habit={editing}
        onClose={() => setSheetOpen(false)}
        onSave={(input) =>
          editing ? editHabit(editing.id, input) : addHabit(input)
        }
        onArchive={(habit) => archive(habit.id)}
        onRestore={(habit) => restore(habit.id)}
        onDelete={(habit) => removeHabit(habit.id)}
        onMakeTask={(habit) => makeTask(habit.id)}
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
  separator: { height: 12 },
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
    borderColor: glowColors.blue + "66",
    shadowColor: glowColors.blue,
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
