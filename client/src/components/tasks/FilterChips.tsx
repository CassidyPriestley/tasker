import { fonts } from "@/constants/fonts";
import { glowColors, GlowTone } from "@/constants/glowColors";
import { radius, useTheme } from "@/context/ThemeContext";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Option<T extends string> = {
  value: T;
  label: string;
  tone?: GlowTone;
  count?: number;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        const accent = glowColors[option.tone ?? "green"];
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                borderColor: selected ? accent + "88" : colors.border,
                backgroundColor: selected
                  ? colors.surfaceRaised
                  : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.text : colors.mutedText },
              ]}
            >
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text
                style={[
                  styles.count,
                  { color: selected ? accent : colors.mutedText },
                ]}
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
  },
  count: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
  },
});
