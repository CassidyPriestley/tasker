import { fonts } from "@/constants/fonts";
import { glowColors } from "@/constants/glowColors";
import { radius, useTheme } from "@/context/ThemeContext";
import { toYMD, weekOf } from "@/lib/dates";
import { StyleSheet, Text, View } from "react-native";

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekStrip({ today }: { today: Date }) {
  const { colors } = useTheme();
  const todayKey = toYMD(today);

  return (
    <View style={styles.row}>
      {weekOf(today).map((day, i) => {
        const isToday = toYMD(day) === todayKey;
        const isPast = day < today && !isToday;

        return (
          <View
            key={toYMD(day)}
            style={[
              styles.day,
              isToday && {
                backgroundColor: colors.surfaceRaised,
                borderColor: glowColors.green + "66",
                shadowColor: glowColors.green,
              },
            ]}
          >
            <Text
              style={[
                styles.letter,
                { color: isToday ? glowColors.green : colors.mutedText },
              ]}
            >
              {LETTERS[i]}
            </Text>
            <Text
              style={[
                styles.date,
                {
                  color: isToday ? colors.text : colors.mutedText,
                  opacity: isPast ? 0.6 : 1,
                },
              ]}
            >
              {day.getDate()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  letter: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1,
  },
  date: {
    fontFamily: fonts.bodyStrong,
    fontSize: 16,
    marginTop: 4,
  },
});
