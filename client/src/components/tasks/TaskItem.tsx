import { glowColors } from "@/constants/glowColors";
import { radius, useTheme } from "@/context/ThemeContext";
import { apiDateToYMD, toYMD } from "@/lib/dates";
import { Task, TaskPriority } from "@/types";
import { Platform, Pressable, StyleSheet, View, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/fonts";

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: glowColors.pink,
  medium: glowColors.orange,
  low: glowColors.blue,
};

// Due date formatting
function dueLabel(dueDate: string) {
  const due = apiDateToYMD(dueDate);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (due === toYMD(today)) return "Today";
  if (due === toYMD(tomorrow)) return "Tomorrow";

  return new Date(`${due}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type Props = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
};

export function TaskItem({ task, onToggle, onPress }: Props) {
  const { colors } = useTheme();
  const done = task.status === "completed";
  const accent = PRIORITY_COLOR[task.priority];

  // Task overdue only if: task unfinished AND has a due date earlier than today
  const overdue =
    !done && !!task.due_date && apiDateToYMD(task.due_date) < toYMD(new Date());

  function handleToggle() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Priority color bar on the left edge */}
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <Pressable
        onPress={handleToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Mark ${task.title} as ${done ? "not done" : "done"}`}
        style={[
          styles.circle,
          done
            ? { backgroundColor: accent, borderColor: accent }
            : { borderColor: colors.borderStrong },
        ]}
      >
        {done ? (
          <Ionicons name="checkmark" size={16} color={colors.onChrome} />
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: done ? colors.mutedText : colors.text,
              textDecorationLine: done ? "line-through" : "none",
            },
          ]}
        >
          {task.title}
        </Text>

        {task.task_description ? (
          <Text
            numberOfLines={1}
            style={[styles.description, { color: colors.mutedText }]}
          >
            {task.task_description}
          </Text>
        ) : null}
      </View>

      {task.due_date ? (
        <Text
          style={[
            styles.due,
            { color: overdue ? colors.danger : colors.mutedText },
          ]}
        >
          {overdue ? "Overdue" : dueLabel(task.due_date)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  due: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
  },
});
