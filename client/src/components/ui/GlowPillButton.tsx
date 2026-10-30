import { ShimmerText } from "@/components/ui/ShimmerText";
import { fonts } from "@/constants/fonts";
import { glowColors, type GlowTone } from "@/constants/glowColors";
import { BlurView, type BlurTint } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const GLASS = {
  blur: 40, //                 0–100. Higher = frostier
  blurTint: "dark" as BlurTint,
  track: "rgba(255,255,255,0.045)", // base color of the glass
  washLeft: 0.16, //           color light left
  washRight: 0.04, //          color light right
  sheen: 0.07, //              light across the top half
  border: 0.6, //              opacity of the colored rim

  pressScale: 0.97, //         how much it shrinks while held
  pressGlow: 0.05, //          how much brighter the glow gets while held
};

const HEIGHT = 56;

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type Props = {
  label: string;
  /** Called on tap. May return a promise; the pill shows a spinner until it's done. */
  onPress: () => void | Promise<void>;
  tone?: GlowTone;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlowPillButton({
  label,
  onPress,
  tone = "green",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const [busy, setBusy] = useState(false);
  const working = loading || busy;
  const inactive = disabled || working;
  const accent = glowColors[tone];
  const pressed = useSharedValue(0); // 1 while a finger is on it

  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setBusy(true);
    Promise.resolve()
      .then(onPress)
      .catch(() => {
        // errors are the caller's to show; we only need to stop the spinner
      })
      .finally(() => setBusy(false));
  }

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pressed.value, [0, 1], [1, GLASS.pressScale]) },
    ],
  }));

  return (
    <Animated.View style={[styles.glowWrap, wrapStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => pressed.set(withTiming(1, { duration: 90 }))}
        onPressOut={() => pressed.set(withTiming(0, { duration: 160 }))}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive, busy: working }}
        style={[
          styles.track,
          {
            borderColor: withAlpha(accent, GLASS.border),
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {/* the frosted glass: blurs whatever is behind the button */}
        <BlurView
          intensity={GLASS.blur}
          tint={GLASS.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.track }]}
        />
        {/* colored light inside the glass */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            withAlpha(accent, GLASS.washLeft),
            withAlpha(accent, GLASS.washRight),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
        {/* sheen across the upper half, like light on a pane */}
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(255,255,255,${GLASS.sheen})`, "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        {/* bright edge along the top */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.4)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topEdge}
        />

        {/* label in the middle, or a spinner while working */}
        <View pointerEvents="none" style={styles.labelArea}>
          {working ? (
            <ActivityIndicator color={accent} />
          ) : (
            <ShimmerText
              text={label}
              color={accent}
              paused={inactive}
              style={styles.label}
            />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    borderRadius: HEIGHT / 2,
  },
  track: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    overflow: "hidden",
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 1,
  },
  labelArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
