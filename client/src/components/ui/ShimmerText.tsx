import { useEffect, useMemo } from "react";
import { StyleProp, StyleSheet, TextStyle, View } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const BASE_OPACITY = 0.5; // Letters stay here and brighten as wave passes
const WAVE = 0.3; // Width of wave
const MAX_GLOW = 12; // Peak glow radius in px

type Props = {
  text: string;
  color: string;
  glowColor?: string;
  style?: StyleProp<TextStyle>;
  paused?: boolean; // Stops wave (while loading)
};

type LetterProps = {
  char: string;
  index: number;
  count: number;
  wave: SharedValue<number>;
  color: string;
  glowColor: string;
  style?: StyleProp<TextStyle>;
  animated: boolean;
};

function Letter({
  char,
  index,
  count,
  wave,
  color,
  glowColor,
  style,
  animated,
}: LetterProps) {
  const waveStyle = useAnimatedStyle(() => {
    const position = count > 1 ? index / (count - 1) : 0.5;
    // the wave's centre travels from just before the first letter to just after the last
    const centre = -WAVE + wave.value * (1 + 2 * WAVE);
    const x = Math.max(0, 1 - Math.abs(position - centre) / WAVE);
    // smoothstep, so letters ease in and out of the light
    const s = x * x * (3 - 2 * x);
    return {
      opacity: BASE_OPACITY + (1 - BASE_OPACITY) * s,
      textShadowRadius: MAX_GLOW * s,
    };
  });

  return (
    <Animated.Text
      style={[
        style,
        {
          color,
          textShadowColor: glowColor,
          textShadowOffset: { width: 0, height: 0 },
        },
        animated ? waveStyle : styles.still,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

export function ShimmerText({
  text,
  color,
  glowColor = color,
  style,
  paused = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const animated = !reduceMotion && !paused;
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      wave.value = 0;
      return;
    }
    // one sweep, a short rest, then again
    wave.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.cubic) }),
        withDelay(700, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [animated, wave]);

  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={styles.row}
    >
      {chars.map((char, i) => (
        <Letter
          key={`${i}-${char}`}
          // a lone space collapses in its own <Text>, so use a non-breaking one
          char={char === " " ? "\u00A0" : char}
          index={i}
          count={chars.length}
          wave={wave}
          color={color}
          glowColor={glowColor}
          style={style}
          animated={animated}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  still: { opacity: 0.9 },
});
