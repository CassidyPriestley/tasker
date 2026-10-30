import { fonts } from "@/constants/fonts";
import { radius, useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  title: string;
  subtitle?: string;
  done: boolean;
  // glow colour for the check circle and the accent bar
  accent: string;
  // small text on the right, e.g. "🔥 12" or "Overdue"
  badge?: string;
  badgeColor?: string;
  onToggle: () => void;
};

export function CheckRow({
  title,
  subtitle,
  done,
  accent,
  badge,
  badgeColor,
  onToggle,
}: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(1);
  const fill = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    fill.value = reduceMotion ? (done ? 1 : 0) : withTiming(done ? 1 : 0);
  }, [done, reduceMotion, fill]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.6 + 0.4 * fill.value }],
  }));

  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        done
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      );
    }
    if (!reduceMotion) {
      scale.set(
        withSequence(
          withTiming(0.85, { duration: 90 }),
          withSpring(1, { damping: 10, stiffness: 260 }),
        ),
      );
    }
    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: done ? accent + "40" : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: accent }]} />

      <Animated.View
        style={[
          styles.circle,
          { borderColor: done ? accent : colors.borderStrong },
          done && { shadowColor: accent, shadowOpacity: 0.8 },
          circleStyle,
        ]}
      >
        <Animated.View
          style={[styles.circleFill, { backgroundColor: accent }, fillStyle]}
        >
          <Ionicons name="checkmark" size={16} color={colors.onChrome} />
        </Animated.View>
      </Animated.View>

      <View style={styles.text}>
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
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: colors.mutedText }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {badge ? (
        <Text style={[styles.badge, { color: badgeColor ?? colors.mutedText }]}>
          {badge}
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  circleFill: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  title: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
  },
});
