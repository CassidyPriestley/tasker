import { AvatarButton } from "@/components/today/AvatarButton";
import { CheckRow } from "@/components/today/CheckRow";
import { GlassCard } from "@/components/today/GlassCard";
import { ProgressRing } from "@/components/today/ProgressRing";
import { WeekStrip } from "@/components/today/WeekStrip";
import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { useAuth } from "@/context/AuthContext";
import { radius, space, useTheme } from "@/context/ThemeContext";
import { useToday } from "@/hooks/use-today";
import { greetingFor } from "@/lib/dates";
import type { TaskPriority } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Habits without their own colour cycle through these
const HABIT_ACCENTS = [
  glowColors.green,
  glowColors.blue,
  glowColors.pink,
  glowColors.orange,
];

const PRIORITY_ACCENT: Record<TaskPriority, string> = {
  high: glowColors.pink,
  medium: glowColors.orange,
  low: glowColors.blue,
};

// room for the floating tab bar
const TAB_BAR_SPACE = 110;

function encouragement(done: number, total: number) {
  if (total === 0) return "Nothing scheduled. Enjoy the quiet.";
  if (done === total) return "Everything's done. Beautiful work.";
  if (done === 0) return "A fresh start. Pick one thing.";
  const left = total - done;
  return `${left} more to go. Keep the momentum.`;
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
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
  } = useToday();

  const now = new Date();
  const dateLabel = now
    .toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  return (
    <ScrollView
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
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={[styles.eyebrow, { color: colors.mutedText }]}>
            {dateLabel}
          </Text>
          <Text
            style={[styles.greeting, { color: colors.text }]}
            numberOfLines={2}
          >
            {greetingFor(now)},{"\n"}
            {user?.username ?? "friend"}
          </Text>
        </View>

        <AvatarButton />
      </View>

      <WeekStrip today={now} />

      {/* PROGRESS */}
      <GlassCard style={styles.progressCard}>
        <ProgressRing done={done} total={total} />
        <View style={styles.flex}>
          <Text style={[styles.cardLabel, { color: colors.mutedText }]}>
            {"TODAY'S PROGRESS"}
          </Text>
          <Text style={[styles.cardMessage, { color: colors.text }]}>
            {isLoading ? "Loading your day…" : encouragement(done, total)}
          </Text>
        </View>
      </GlassCard>

      {error ? (
        <Pressable
          onPress={refresh}
          style={[styles.error, { borderColor: colors.danger + "55" }]}
        >
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error} Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.mutedText} style={styles.loader} />
      ) : (
        <>
          {/* HABITS */}
          <Section title="Habits" count={habits.length}>
            {habits.length === 0 ? (
              <Empty text="No habits scheduled for today." />
            ) : (
              habits.map(({ habit, todayLogId, streak }, i) => (
                <CheckRow
                  key={habit.id}
                  title={habit.title}
                  subtitle={habit.description ?? undefined}
                  done={todayLogId !== null}
                  accent={
                    habit.color ?? HABIT_ACCENTS[i % HABIT_ACCENTS.length]
                  }
                  badge={streak > 0 ? `🔥 ${streak}` : undefined}
                  badgeColor={glowColors.orange}
                  onToggle={() => toggleHabit(habit.id)}
                />
              ))
            )}
          </Section>

          {/* TASKS */}
          <Section title="Tasks" count={tasks.length}>
            {tasks.length === 0 ? (
              <Empty text="No tasks due today." />
            ) : (
              tasks.map((task) => (
                <CheckRow
                  key={task.id}
                  title={task.title}
                  subtitle={task.task_description ?? undefined}
                  done={task.status === "completed"}
                  accent={PRIORITY_ACCENT[task.priority]}
                  badge={task.overdue ? "Overdue" : undefined}
                  badgeColor={colors.danger}
                  onToggle={() => toggleTask(task.id)}
                />
              ))
            )}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.sectionCount, { color: colors.mutedText }]}>
          {count}
        </Text>
      </View>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <Text style={[styles.emptyText, { color: colors.mutedText }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: space.lg,
    gap: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  eyebrow: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    marginTop: 6,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    padding: space.lg,
  },
  cardLabel: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  cardMessage: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  loader: { marginTop: space.xl },
  section: { gap: space.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  sectionCount: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
  },
  list: { gap: 10 },
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
});
