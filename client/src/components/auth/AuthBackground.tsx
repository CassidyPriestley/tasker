import { glowColors } from "@/constants/glowColors";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type Blob = {
  id: string;
  color: string;
  size: number; //          diameter in points
  top: DimensionValue; //   where the blob starts
  left: DimensionValue;
  dx: number; //            how far it drifts sideways…
  dy: number; //            …and up/down
  duration: number; //      ms for one drift; all different so they never sync
  opacity: number; //       strength at the blob's center (dark mode)
};

const BLOBS: Blob[] = [
  {
    id: "green",
    color: glowColors.green,
    size: 440,
    top: "-14%",
    left: "-35%",
    dx: 60,
    dy: 40,
    duration: 14000,
    opacity: 0.32,
  },
  {
    id: "cyan",
    color: glowColors.blue,
    size: 400,
    top: "-2%",
    left: "40%",
    dx: -50,
    dy: 60,
    duration: 18000,
    opacity: 0.26,
  },
  {
    id: "pink",
    color: glowColors.pink,
    size: 360,
    top: "52%",
    left: "-30%",
    dx: 45,
    dy: -50,
    duration: 22000,
    opacity: 0.16,
  },
  {
    id: "orange",
    color: glowColors.orange,
    size: 380,
    top: "66%",
    left: "45%",
    dx: -40,
    dy: -45,
    duration: 26000,
    opacity: 0.16,
  },
];

// A radial gradient that fades to transparent looks like a blur,
// but is much cheaper for the phone than a real blur filter
function AuroraBlob({ blob, strength }: { blob: Blob; strength: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return; // Reduce Motion on → blobs stay still
    progress.value = withRepeat(
      withTiming(1, {
        duration: blob.duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1, //   forever
      true, // glide back instead of jumping
    );
  }, [reduceMotion, blob.duration, progress]);

  // only transform is animated: it's the cheapest thing to move
  const drift = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, blob.dx]) },
      { translateY: interpolate(progress.value, [0, 1], [0, blob.dy]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.12, 0.94]) },
    ],
  }));

  const r = blob.size / 2;
  return (
    <Animated.View
      style={[
        styles.blob,
        { width: blob.size, height: blob.size, top: blob.top, left: blob.left },
        drift,
      ]}
    >
      <Svg width={blob.size} height={blob.size}>
        <Defs>
          <RadialGradient id={`blob-${blob.id}`} cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor={blob.color}
              stopOpacity={blob.opacity * strength}
            />
            <Stop
              offset="0.45"
              stopColor={blob.color}
              stopOpacity={blob.opacity * strength * 0.45}
            />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#blob-${blob.id})`} />
      </Svg>
    </Animated.View>
  );
}

export function AuthBackground({ children }: { children: ReactNode }) {
  const { colors, scheme } = useTheme();
  // light backgrounds show color much more, so tone it down there
  const strength = scheme === "dark" ? 1 : 0.5;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
        {BLOBS.map((blob) => (
          <AuroraBlob key={blob.id} blob={blob} strength={strength} />
        ))}

        {/* darkens the edges so the colors fade out toward the screen borders */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="vignette" cx="50%" cy="40%" rx="85%" ry="75%">
              <Stop
                offset="0.4"
                stopColor={colors.background}
                stopOpacity={0}
              />
              <Stop
                offset="1"
                stopColor={colors.background}
                stopOpacity={0.9}
              />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#vignette)" />
        </Svg>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clip: { overflow: "hidden" },
  blob: { position: "absolute" },
  content: { flex: 1 },
});
