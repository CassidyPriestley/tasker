import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { radius, useTheme } from "@/context/ThemeContext";
import type { HabitWithStats } from "@/hooks/use-habits";
import { isScheduledOn, toYMD, weekOf } from "@/lib/dates";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { habitColor, habitIcon, scheduleLabel } from "./habitOptions";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  item: HabitWithStats;
  onToggle: () => void;
  onPress: () => void;
};

export function HabitCard({ item, onToggle, onPress }: Props) {
  const { colors } = useTheme();
  const { habit, loggedDays, todayLogId, streak } = item;

  const accent = habitColor(habit);
  const now = new Date();
  const today = toYMD(now);
  const archived = !!habit.archived_at;
  const scheduledToday = isScheduledOn(habit, now);
  const done = todayLogId !== null;

  // 0 → 1 progress towards the goal, if there is one
  const goal = habit.target_streak;
  const progress = goal ? Math.min(streak / goal, 1) : 0;

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
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: done ? accent + "55" : colors.border,
          opacity: archived ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* TOP ROW: icon, title, check button */}
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: accent + "1F" }]}>
          <Ionicons name={habitIcon(habit)} size={20} color={accent} />
        </View>

        <View style={styles.body}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: colors.text }]}
          >
            {habit.title}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedText }]}>
            {archived ? "Archived" : scheduleLabel(habit)}
            {streak > 0 ? `  ·  🔥 ${streak}` : ""}
          </Text>
        </View>

        {archived ? null : scheduledToday ? (
          <Pressable
            onPress={handleToggle}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={`Mark ${habit.title} as ${done ? "not done" : "done"} today`}
            style={[
              styles.check,
              done
                ? {
                    backgroundColor: accent,
                    borderColor: accent,
                    shadowColor: accent,
                    shadowOpacity: 0.6,
                  }
                : { borderColor: colors.borderStrong },
            ]}
          >
            {done ? (
              <Ionicons name="checkmark" size={20} color={colors.onChrome} />
            ) : null}
          </Pressable>
        ) : (
          <Text style={[styles.rest, { color: colors.mutedText }]}>
            Rest day
          </Text>
        )}
      </View>

      {habit.description ? (
        <Text
          numberOfLines={2}
          style={[styles.description, { color: colors.mutedText }]}
        >
          {habit.description}
        </Text>
      ) : null}

      {/* THIS WEEK: one dot per day */}
      {archived ? null : (
        <View style={styles.week}>
          {weekOf(now).map((day, i) => {
            const ymd = toYMD(day);
            const scheduled = isScheduledOn(habit, day);
            const logged = loggedDays.has(ymd);
            const isToday = ymd === today;
            return (
              <View key={ymd} style={styles.dayCol}>
                <Text
                  style={[
                    styles.dayLetter,
                    { color: isToday ? colors.text : colors.mutedText },
                  ]}
                >
                  {DAY_LETTERS[i]}
                </Text>
                <View
                  style={[
                    styles.dot,
                    logged
                      ? { backgroundColor: accent, borderColor: accent }
                      : {
                          borderColor: scheduled
                            ? colors.borderStrong
                            : "transparent",
                          backgroundColor: scheduled
                            ? "transparent"
                            : colors.border,
                        },
                    isToday &&
                      scheduled &&
                      !logged && { borderColor: accent + "88" },
                  ]}
                />
              </View>
            );
          })}
        </View>
      )}

      {/* GOAL: progress bar towards target_streak */}
      {goal && !archived ? (
        <View style={styles.goal}>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor:
                    progress >= 1 ? glowColors.green : accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.goalText, { color: colors.mutedText }]}>
            {progress >= 1 ? "Goal reached 🎉" : `${streak} / ${goal} days`}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 14,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: {
    fontFamily: fonts.bodyStrong,
    fontSize: 16,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  check: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  rest: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -6,
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCol: {
    alignItems: "center",
    gap: 6,
  },
  dayLetter: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  goal: { gap: 6 },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  goalText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
  },
});
