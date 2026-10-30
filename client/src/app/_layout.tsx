import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  Stack,
} from "expo-router";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useMemo } from "react";
import { useFonts } from "expo-font";
import { BodoniModa_600SemiBold } from "@expo-google-fonts/bodoni-moda";
import { Manrope_500Medium, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function RootNavigator() {
  const { scheme, colors, isLoading: themeLoading } = useTheme();
  const { user, isLoading: authLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    BodoniModa_600SemiBold,
    Manrope_500Medium,
    Manrope_700Bold,
  });

  const navTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [scheme, colors]);

  // wait until we know the saved theme and whether someone is logged in
  if (themeLoading || authLoading || !fontsLoaded) return null;

  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayer() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
