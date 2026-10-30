import { fonts } from "@/constants/fonts";
import { radius, useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { glowColors, type GlowTone } from "@/constants/glowColors";
import { forwardRef, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
} from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = TextInputProps & {
  label: string;
  tone?: GlowTone;
};

// Removes the browser's default focus outline on web (the glow replaces it)
const webReset = (Platform.OS === "web"
  ? { outlineStyle: "none" }
  : null) as unknown as TextStyle;

export const LuxInput = forwardRef<TextInput, Props>(function LuxInput(
  {
    label,
    value,
    secureTextEntry,
    onFocus,
    onBlur,
    style,
    tone = "green",
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const accent = glowColors[tone];
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  const hasValue = !!value && value.length > 0;

  const focus = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, focus]);

  useEffect(() => {
    lift.value = withTiming(focused || hasValue ? 1 : 0, { duration: 180 });
  }, [focused, hasValue, lift]);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, accent]),
    shadowOpacity: interpolate(focus.value, [0, 1], [0, 0.22]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(lift.value, [0, 1], [20, 9]),
    fontSize: interpolate(lift.value, [0, 1], [16, 11.5]),
    color: interpolateColor(focus.value, [0, 1], [colors.mutedText, accent]),
  }));

  return (
    <Animated.View
      style={[
        styles.box,
        { backgroundColor: colors.glass, shadowColor: accent },
        boxStyle,
      ]}
    >
      {/* a thin line of light catching the top edge of the glass */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.22)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLight}
      />

      <TextInput
        ref={ref}
        value={value}
        secureTextEntry={secureTextEntry && !reveal}
        selectionColor={accent}
        cursorColor={accent}
        placeholderTextColor={colors.mutedText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { color: colors.text, fontFamily: fonts.body },
          secureTextEntry ? styles.inputWithToggle : null,
          webReset,
          style,
        ]}
        {...rest}
      />

      <Animated.Text
        pointerEvents="none"
        numberOfLines={1}
        style={[styles.label, { fontFamily: fonts.body }, labelStyle]}
      >
        {label}
      </Animated.Text>

      {secureTextEntry ? (
        <Pressable
          onPress={() => setReveal((r) => !r)}
          hitSlop={12}
          style={styles.toggle}
          accessibilityRole="button"
          accessibilityLabel={reveal ? "Hide password" : "Show password"}
        >
          <Text style={[styles.toggleText, { color: colors.mutedText }]}>
            {reveal ? "Hide" : "Show"}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  topLight: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
  },
  input: {
    height: 60,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 6,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 68,
  },
  label: {
    position: "absolute",
    left: 16,
  },
  toggle: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  toggleText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
