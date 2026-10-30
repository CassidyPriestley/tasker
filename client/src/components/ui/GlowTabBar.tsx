import { fonts } from "@/constants/fonts";
import { glowColors, type GlowTone } from "@/constants/glowColors";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { ComponentProps, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type Props = TabBarProps & { tone?: GlowTone };

type IconName = ComponentProps<typeof Ionicons>["name"];

// Route name -> icon. Add entries as you add/rename tabs.
const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: "today", off: "today-outline" },
  tasks: { on: "checkbox", off: "checkbox-outline" },
  habits: { on: "repeat", off: "repeat-outline" },
};

const TAB_TONES: Record<string, GlowTone> = {
  index: "green",
  tasks: "orange",
  habits: "blue",
};

// Polished-chrome rim. Swap for your palette's chrome stops if you like.
const CHROME_RIM = [
  "#5B5F66",
  "#F2F4F7",
  "#8C9098",
  "#34373C",
  "#B9BDC4",
] as const;

const PAD = 6;
const BAR_HEIGHT = 64;

export function GlowTabBar({ state, descriptors, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const currentRoute = state.routes[state.index].name;
  const accent = glowColors[TAB_TONES[currentRoute] ?? "green"];

  const [trackWidth, setTrackWidth] = useState(0);
  const tabWidth = trackWidth / state.routes.length;

  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(state.index * tabWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  }, [state.index, tabWidth, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <LinearGradient
        colors={CHROME_RIM}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rim}
      >
        <View style={styles.clip}>
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]}
          />
          {/* line of light catching the top edge of the glass */}
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

          <View
            style={styles.track}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {trackWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicator,
                  {
                    width: tabWidth,
                    borderColor: accent + "55",
                    shadowColor: accent,
                  },
                  indicatorStyle,
                ]}
              />
            )}

            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const label =
                typeof options.tabBarLabel === "string"
                  ? options.tabBarLabel
                  : (options.title ?? route.name);
              const icon = ICONS[route.name] ?? {
                on: "ellipse",
                off: "ellipse-outline",
              };

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              };

              return (
                <TabItem
                  key={route.key}
                  focused={focused}
                  label={label}
                  iconName={focused ? icon.on : icon.off}
                  accent={accent}
                  mutedText={colors.mutedText}
                  textColor={colors.text}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                />
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

type ItemProps = {
  focused: boolean;
  label: string;
  iconName: IconName;
  accent: string;
  mutedText: string;
  textColor: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

function TabItem({
  focused,
  label,
  iconName,
  accent,
  mutedText,
  textColor,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: ItemProps) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [focused, p]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.12 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + p.value * 0.4,
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={iconName}
          size={22}
          color={focused ? accent : mutedText}
        />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: focused ? textColor : mutedText },
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  rim: {
    width: "100%",
    maxWidth: 360,
    padding: 1.5,
    borderRadius: 999,
  },
  clip: {
    height: BAR_HEIGHT,
    borderRadius: 999,
    overflow: "hidden",
  },
  topLight: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 1,
  },
  track: {
    flex: 1,
    margin: PAD,
    flexDirection: "row",
  },
  indicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
