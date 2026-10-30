import { radius, useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Smoked-glass panel with a thin line of light along the top edge
export function GlassCard({ children, style }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.glass, borderColor: colors.border },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.18)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLight}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  topLight: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
});
