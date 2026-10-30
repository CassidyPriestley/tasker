import { ShimmerText } from "@/components/ui/ShimmerText";
import { fonts } from "@/constants/fonts";
import { BlurView, type BlurTint } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useId, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";

const GLASS = {
  // The track (the long pill)
  blur: 40, //                 0–100. Higher = frostier
  blurTint: "dark" as BlurTint, // try "systemUltraThinMaterialDark" for clearer glass
  track: "rgba(255,255,255,0.045)", // base colour. Higher alpha = lighter, milkier glass
  washLeft: 0.16, //           strength of the coloured light on the left
  washRight: 0.04, //          ...and on the right
  sheen: 0.07, //              light across the top half of the pane
  border: 0.32, //             opacity of the coloured rim around the pill

  // The knob (the circle you drag)
  knob: "rgba(0,0,0,0.6)", //darkness of the knob. alpha 0 = clear glass, 1 = solid black
  knobBlur: 50,
  knobTint: 0.1, //how much of the glow colour tints the knob. 0 = pure black

  // How far you must drag (0–1) before letting go confirms
  threshold: 0.8,

  // How long the knob takes to glide back when you let go early (ms)
  returnMs: 450,
};

// Glow colours. Pick one per button with the `tone` prop.
const TONES = {
  neutral: "#E4E7EB",
  green: "#2EE59D",
  blue: "#00FFFF",
  danger: "#FF4D3D",
} as const;

export type GlowTone = keyof typeof TONES;
export type GlowIcon = "arrow" | "check" | "trash";

const ICON_PATHS: Record<GlowIcon, string[]> = {
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13", "M10 11v6", "M14 11v6"],
};

const HEIGHT = 64;
const INSET = 6;
const KNOB = HEIGHT - INSET * 2;

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type Props = {
  label: string;
  /** Called when the knob is swiped all the way across. May return a promise. */
  onPress: () => void | Promise<void>;
  tone?: GlowTone;
  icon?: GlowIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlowButton({
  label,
  onPress,
  tone = "green",
  icon = "arrow",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const working = loading || busy;
  const inactive = disabled || working;
  const accent = TONES[tone];
  // unique gradient id, so several buttons on one screen don't share a rim colour
  const rimId = `rim${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const trackWidth = useSharedValue(0);
  const x = useSharedValue(0); // how far the knob has travelled, in px
  const armed = useSharedValue(false);
  const breathe = useSharedValue(0);
  const maxX = useDerivedValue(() =>
    Math.max(0, trackWidth.value - KNOB - INSET * 2),
  );

  const light = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const tick = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const complete = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setBusy(true);
    Promise.resolve()
      .then(onPress)
      .catch(() => {
        // only need to reset the knob
      })
      .finally(() => {
        setBusy(false);
        x.value = withTiming(0, {
          duration: GLASS.returnMs,
          easing: Easing.out(Easing.cubic),
        });
      });
  }, [onPress, x]);

  useEffect(() => {
    if (reduceMotion) return;
    // the outer glow slowly swells and settles
    breathe.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // one small nudge on mount, so people know the knob moves
    x.value = withDelay(
      1500,
      withSequence(
        withTiming(20, { duration: 380, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 420, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
  }, [reduceMotion, breathe, x]);

  const pan = Gesture.Pan()
    .enabled(!inactive)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      runOnJS(light)();
    })
    .onUpdate((e) => {
      x.value = Math.min(Math.max(e.translationX, 0), maxX.value);
      const isArmed = x.value >= maxX.value * GLASS.threshold;
      if (isArmed && !armed.value) {
        armed.value = true;
        runOnJS(tick)();
      } else if (!isArmed && armed.value) {
        armed.value = false;
      }
    })
    .onEnd(() => {
      armed.value = false;
      if (x.value >= maxX.value * GLASS.threshold) {
        x.value = withTiming(maxX.value, {
          duration: 160,
          easing: Easing.out(Easing.quad),
        });
        runOnJS(complete)();
      } else {
        x.value = withTiming(0, {
          duration: GLASS.returnMs,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  // a plain tap on the button nudges the knob instead of doing nothing
  const tap = Gesture.Tap()
    .enabled(!inactive)
    .onEnd((_e, success) => {
      if (!success) return;
      runOnJS(light)();
      x.value = withSequence(
        withTiming(22, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.cubic) }),
      );
    });

  const gesture = Gesture.Race(pan, tap);

  const wrapStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(breathe.value, [0, 1], [0.28, 0.5]),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.min(Math.max(x.value, 0), maxX.value) }],
  }));
  // coloured light that follows the knob across the track
  const fillStyle = useAnimatedStyle(() => {
    const travelled = Math.min(Math.max(x.value, 0), maxX.value);
    return {
      width: travelled + KNOB / 2 + INSET,
      // invisible until the knob actually moves, so nothing glows around it at rest
      opacity: interpolate(travelled, [0, 28], [0, 1], Extrapolation.CLAMP),
    };
  });
  // the label fades as the knob passes over it
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      x.value,
      [0, Math.max(1, maxX.value * 0.55)],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      style={[styles.glowWrap, { shadowColor: accent }, wrapStyle, style]}
    >
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Swipe right to confirm, or double tap"
          accessibilityState={{ disabled: inactive, busy: working }}
          accessibilityActions={[{ name: "activate", label }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "activate" && !inactive) {
              complete();
            }
          }}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
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
          {/* coloured light inside the glass */}
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

          {/* trail of colour behind the knob as it travels */}
          <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]}>
            <LinearGradient
              colors={[withAlpha(accent, 0.34), withAlpha(accent, 0.1)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* label, centred in the space beside the knob */}
          <Animated.View
            pointerEvents="none"
            style={[styles.labelArea, labelStyle]}
          >
            <ShimmerText
              text={label}
              color={accent}
              paused={inactive}
              style={styles.label}
            />
          </Animated.View>

          {/* the knob: dark glass disc with a thin rim */}
          <Animated.View style={[styles.knob, knobStyle]}>
            <BlurView
              intensity={GLASS.knobBlur}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.knob }]}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: withAlpha(accent, GLASS.knobTint) },
              ]}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.6 }}
              style={StyleSheet.absoluteFill}
            />
            {/* thin ring in the glow colour, a touch brighter on top */}
            <Svg
              width={KNOB}
              height={KNOB}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <SvgGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={accent} stopOpacity={0.95} />
                  <Stop offset="1" stopColor={accent} stopOpacity={0.55} />
                </SvgGradient>
              </Defs>
              <Circle
                cx={KNOB / 2}
                cy={KNOB / 2}
                r={KNOB / 2 - 0.75}
                fill="none"
                stroke={`url(#${rimId})`}
                strokeWidth={1.5}
              />
            </Svg>

            <View style={styles.knobContent}>
              {working ? (
                <ActivityIndicator color={accent} />
              ) : (
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  {/* soft halo drawn from the same strokes, so the icon glows */}
                  {ICON_PATHS[icon].map((d) => (
                    <Path
                      key={`halo-${d}`}
                      d={d}
                      fill="none"
                      stroke={accent}
                      strokeOpacity={0.12}
                      strokeWidth={11}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {ICON_PATHS[icon].map((d) => (
                    <Path
                      key={`mid-${d}`}
                      d={d}
                      fill="none"
                      stroke={accent}
                      strokeOpacity={0.26}
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {ICON_PATHS[icon].map((d) => (
                    <Path
                      key={`core-${d}`}
                      d={d}
                      fill="none"
                      stroke={accent}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </Svg>
              )}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    borderRadius: HEIGHT / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 26,
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
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: HEIGHT / 2,
    overflow: "hidden",
  },
  labelArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: KNOB + INSET * 2,
    paddingRight: 12,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 20,
    letterSpacing: 0.3,
  },
  knob: {
    position: "absolute",
    top: INSET - 1,
    left: INSET - 1,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    overflow: "hidden",
  },
  knobContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
