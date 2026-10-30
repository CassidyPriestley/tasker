import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  done: number;
  total: number;
  size?: number;
};

export function ProgressRing({ done, total, size = 132 }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = total === 0 ? 0 : done / total;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = reduceMotion
      ? ratio
      : withTiming(ratio, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const percent = Math.round(ratio * 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={glowColors.blue} />
            <Stop offset="1" stopColor={glowColors.green} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          // start at 12 o'clock instead of 3
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.percent, { color: colors.text }]}>{percent}%</Text>
        <Text style={[styles.caption, { color: colors.mutedText }]}>
          {done} of {total}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  percent: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
