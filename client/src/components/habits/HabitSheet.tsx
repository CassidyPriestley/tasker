// A bottom sheet with the habit form. Like TaskSheet, it does both jobs:
//   - habit prop is null   → "New habit" (empty form)
//   - habit prop is a Habit → "Edit habit" (filled in, plus archive / delete)

import { FilterChips } from "@/components/tasks/FilterChips";
import { GlowPillButton } from "@/components/ui/GlowPillButton";
import { LuxInput } from "@/components/ui/LuxInput";
import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { radius, space, useTheme } from "@/context/ThemeContext";
import { DAY_NAMES } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import type { CreateHabitInput, DayName, Habit, HabitFrequency } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEFAULT_ICON,
  HABIT_COLORS,
  HABIT_ICONS,
  habitColor,
  habitIcon,
  type IconName,
} from "./habitOptions";

const FREQUENCIES: { value: HabitFrequency; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "range", label: "Pick days" },
];

// Goal choices, as strings because FilterChips works with strings
const GOALS = [
  { value: "none", label: "No goal" },
  { value: "7", label: "7 days" },
  { value: "21", label: "21" },
  { value: "30", label: "30" },
  { value: "100", label: "100" },
];

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSave: (input: CreateHabitInput) => Promise<void>;
  onArchive: (habit: Habit) => Promise<void>;
  onRestore: (habit: Habit) => Promise<void>;
  onDelete: (habit: Habit) => void;
  onMakeTask: (habit: Habit) => Promise<void>;
};

export function HabitSheet({
  visible,
  habit,
  onClose,
  onSave,
  onArchive,
  onRestore,
  onDelete,
  onMakeTask,
}: Props) {
  // The screen gives this a new `key` each time it opens, so these starting
  // values are re-read for every habit (same trick as TaskSheet)
  const [title, setTitle] = useState(habit?.title ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [frequency, setFrequency] = useState<HabitFrequency>(
    habit?.frequency ?? "daily",
  );
  const [days, setDays] = useState<DayName[]>(habit?.days ?? []);
  const [color, setColor] = useState(
    habit ? habitColor(habit) : HABIT_COLORS[0],
  );
  const [icon, setIcon] = useState<IconName>(
    habit ? habitIcon(habit) : DEFAULT_ICON,
  );
  const [goal, setGoal] = useState(
    habit?.target_streak ? String(habit.target_streak) : "none",
  );
  const [makesTasks, setMakesTasks] = useState(!!habit?.generates_task);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isEditing = habit !== null;
  const isArchived = !!habit?.archived_at;

  // A custom goal (e.g. 45) still shows up as a choice when editing
  const goalOptions = GOALS.some((g) => g.value === goal)
    ? GOALS
    : [...GOALS, { value: goal, label: goal }];

  function toggleDay(day: DayName) {
    setDays((list) =>
      list.includes(day) ? list.filter((d) => d !== day) : [...list, day],
    );
  }

  // runs an async action with the spinner on and shows any error
  async function run(action: () => Promise<void>, closeAfter = true) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (closeAfter) onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Give your habit a name.");
      return;
    }
    if (frequency === "range" && days.length === 0) {
      setError("Pick at least one day.");
      return;
    }

    return run(() =>
      onSave({
        title: title.trim(),
        description: description.trim() || null,
        frequency,
        // keep the days in Sunday → Saturday order; daily habits have none
        days:
          frequency === "range"
            ? DAY_NAMES.filter((d) => days.includes(d))
            : [],
        color,
        icon,
        target_streak: goal === "none" ? null : Number(goal),
        generates_task: makesTasks,
      }),
    );
  }

  // Deleting can't be undone, so ask first (the native iOS pattern)
  function confirmDelete(target: Habit) {
    Alert.alert(
      "Delete habit?",
      `"${target.title}" and its streak history will be gone for good.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete(target);
            onClose();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose} // Android back button
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* dimmed background: tapping it closes the sheet */}
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityLabel="Close"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              paddingBottom: insets.bottom + space.lg,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
          >
            <Text style={[styles.heading, { color: colors.text }]}>
              {isEditing ? "Edit habit" : "New habit"}
            </Text>

            {isArchived ? (
              // the backend won't edit archived habits, so only offer restore
              <Text style={[styles.hint, { color: colors.mutedText }]}>
                This habit is archived. Restore it to edit it or check it off
                again.
              </Text>
            ) : (
              <>
                <LuxInput
                  label="Name"
                  tone="blue"
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                  autoFocus={!isEditing}
                />
                <LuxInput
                  label="Why it matters (optional)"
                  tone="blue"
                  value={description}
                  onChangeText={setDescription}
                />

                <Text style={[styles.label, { color: colors.mutedText }]}>
                  HOW OFTEN
                </Text>
                <FilterChips
                  options={FREQUENCIES.map((f) => ({ ...f, tone: "blue" }))}
                  value={frequency}
                  onChange={setFrequency}
                />

                {frequency === "range" ? (
                  <View style={styles.days}>
                    {DAY_NAMES.map((day, i) => {
                      const on = days.includes(day);
                      return (
                        <Pressable
                          key={day}
                          onPress={() => toggleDay(day)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={day}
                          style={[
                            styles.day,
                            on
                              ? { backgroundColor: color, borderColor: color }
                              : { borderColor: colors.borderStrong },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              { color: on ? colors.onChrome : colors.text },
                            ]}
                          >
                            {DAY_LETTERS[i]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={[styles.label, { color: colors.mutedText }]}>
                  COLOR
                </Text>
                <View style={styles.swatches}>
                  {HABIT_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: c === color }}
                      style={[
                        styles.swatchRing,
                        { borderColor: c === color ? c : "transparent" },
                      ]}
                    >
                      <View style={[styles.swatch, { backgroundColor: c }]} />
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.mutedText }]}>
                  ICON
                </Text>
                <View style={styles.icons}>
                  {HABIT_ICONS.map((name) => {
                    const on = name === icon;
                    return (
                      <Pressable
                        key={name}
                        onPress={() => setIcon(name)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={name}
                        style={[
                          styles.iconChoice,
                          {
                            borderColor: on ? color + "88" : colors.border,
                            backgroundColor: on ? color + "1F" : "transparent",
                          },
                        ]}
                      >
                        <Ionicons
                          name={name}
                          size={20}
                          color={on ? color : colors.mutedText}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.mutedText }]}>
                  STREAK GOAL
                </Text>
                <FilterChips
                  options={goalOptions.map((g) => ({ ...g, tone: "blue" }))}
                  value={goal}
                  onChange={setGoal}
                />

                <View style={styles.switchRow}>
                  <View style={styles.flexShrink}>
                    <Text style={[styles.switchTitle, { color: colors.text }]}>
                      Also make it a task
                    </Text>
                    <Text style={[styles.hint, { color: colors.mutedText }]}>
                      Lets you add this habit to your Tasks list.
                    </Text>
                  </View>
                  <Switch
                    value={makesTasks}
                    onValueChange={setMakesTasks}
                    trackColor={{ true: glowColors.blue, false: colors.border }}
                    thumbColor={colors.text}
                  />
                </View>

                {/* only for saved habits that have "make it a task" turned on */}
                {isEditing && !!habit.generates_task ? (
                  <Pressable
                    onPress={() =>
                      run(async () => {
                        await onMakeTask(habit);
                        setNotice("Added to your Tasks.");
                      }, false)
                    }
                    disabled={busy}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={styles.linkButton}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={glowColors.green}
                    />
                    <Text style={[styles.linkText, { color: glowColors.green }]}>
                      Add to today&apos;s tasks
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </ScrollView>

          {/* Footer sits outside the ScrollView so Save is always visible */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}
            {notice ? (
              <Text style={[styles.notice, { color: glowColors.green }]}>
                {notice}
              </Text>
            ) : null}

            {/* the one loud button; everything else is quieter text */}
            {isArchived ? (
              <GlowPillButton
                label="Restore habit"
                tone="blue"
                loading={busy}
                onPress={() => run(() => onRestore(habit!))}
              />
            ) : (
              <GlowPillButton
                label={isEditing ? "Save changes" : "Add habit"}
                tone="blue"
                loading={busy}
                onPress={handleSave}
              />
            )}

            {isEditing ? (
              <View style={styles.quietRow}>
                {!isArchived ? (
                  <>
                    <Pressable
                      onPress={() => run(() => onArchive(habit))}
                      disabled={busy}
                      accessibilityRole="button"
                      hitSlop={8}
                    >
                      <Text
                        style={[styles.quietText, { color: colors.mutedText }]}
                      >
                        Archive
                      </Text>
                    </Pressable>
                    <Text style={[styles.quietText, { color: colors.border }]}>
                      ·
                    </Text>
                  </>
                ) : null}
                <Pressable
                  onPress={() => confirmDelete(habit)}
                  disabled={busy}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={[styles.quietText, { color: colors.danger }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  flexShrink: { flexShrink: 1 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "92%",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  form: {
    padding: space.lg,
    gap: space.md,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 26,
    marginBottom: space.xs,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: space.xs,
    marginBottom: -space.xs,
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
  },
  swatches: {
    flexDirection: "row",
    gap: 12,
  },
  swatchRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  icons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.xs,
  },
  switchTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  notice: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  linkText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quietRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.md,
    paddingTop: space.xs,
  },
  quietText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
});
