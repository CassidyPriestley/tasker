import { FilterChips } from "@/components/tasks/FilterChips";
import { LuxInput } from "@/components/ui/LuxInput";
import { fonts } from "@/constants/fonts";
import { radius, space, useTheme } from "@/context/ThemeContext";
import { addDays, apiDateToYMD, toYMD } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import type { CreateTaskInput, Task, TaskPriority } from "@/types";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowPillButton } from "../ui/GlowPillButton";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// "none" means no due date; everything else is a "YYYY-MM-DD" string.
function dueOptions(current: string) {
  const today = new Date();
  const options = [
    { value: "none", label: "No date" },
    { value: toYMD(today), label: "Today" },
    { value: toYMD(addDays(today, 1)), label: "Tomorrow" },
    { value: toYMD(addDays(today, 7)), label: "Next week" },
  ];
  // When editing a task due on some other day, keep that day as a choice too
  if (!options.some((o) => o.value === current)) {
    const label = new Date(`${current}T12:00:00`).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric" },
    );
    options.push({ value: current, label });
  }
  return options;
}

type Props = {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (input: CreateTaskInput) => Promise<void>;
  onDelete: (task: Task) => void;
};

export function TaskSheet({ visible, task, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.task_description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium",
  );
  const [due, setDue] = useState(
    task?.due_date ? apiDateToYMD(task.due_date) : "none",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isEditing = task !== null;

  async function handleSave() {
    if (!title.trim()) {
      setError("Give your task a little.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        task_description: description.trim(),
        priority,
        due_date: due === "none" ? undefined : due,
      });
      onClose();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
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
              {isEditing ? "Edit task" : "New task"}
            </Text>

            <LuxInput
              label="Title"
              value={title}
              tone="orange"
              onChangeText={setTitle}
              returnKeyType="done"
              autoFocus={!isEditing}
            />
            <LuxInput
              label="Notes (optional)"
              value={description}
              tone="orange"
              onChangeText={setDescription}
            />

            <Text style={[styles.label, { color: colors.mutedText }]}>
              PRIORITY
            </Text>
            <FilterChips
              options={PRIORITIES.map((p) => ({ ...p, tone: "orange" }))}
              value={priority}
              onChange={setPriority}
            />

            <Text style={[styles.label, { color: colors.mutedText }]}>DUE</Text>
            <FilterChips
              options={dueOptions(due).map((d) => ({ ...d, tone: "orange" }))}
              value={due}
              onChange={setDue}
            />

            {/* GlowButton is swipe-to-confirm: drag the knob across */}
            <View style={[styles.footer, { borderColor: colors.border }]}>
              {error ? (
                <Text style={[styles.error, { color: colors.danger }]}>
                  {error}
                </Text>
              ) : null}

              <GlowPillButton
                label={isEditing ? "Save changes" : "Add task"}
                tone="orange"
                onPress={handleSave}
                loading={saving}
                style={styles.rowButton}
              />

              {/* Swiping to delete makes it hard to delete a task by accident */}
              {isEditing ? (
                <View style={styles.quietRow}>
                  <Pressable
                    onPress={() => {
                      onDelete(task);
                      onClose();
                    }}
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "90%",
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
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.sm,
  },
  rowButton: { flex: 1 },
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
