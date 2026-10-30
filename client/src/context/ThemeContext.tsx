import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// NOT CONTEXT RELATED
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 };

export type ThemePreference = "light" | "dark" | "system";
type Scheme = "light" | "dark";

const STORAGE_KEYS = "theme-preference";

export type Palette = {
  background: string;
  surface: string;
  surfaceRaised: string; // cards sitting on surface
  text: string;
  mutedText: string;
  primary: string; // links, focus glow (not the button anymore)
  border: string; // hairlines
  borderStrong: string;
  chrome: readonly [string, string, ...string[]]; // metal gradient stops
  onChrome: string; // text color on top of chrome
  glass: string; // smoked-glass card tint
  monogram: string; // background pattern color
  danger: string;
};

export const themes: Record<"light" | "dark", Palette> = {
  dark: {
    background: "#070709",
    surface: "#101014",
    surfaceRaised: "#17171C",
    text: "#F2F3F5",
    mutedText: "#8A8F98",
    primary: "#9DB8FF",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.16)",
    chrome: ["#FFFFFF", "#B8BDC6", "#4A4E56", "#E4E7EB", "#7A7F88", "#F5F6F8"],
    onChrome: "#0A0A0C",
    glass: "rgba(20,20,26,0.55)",
    monogram: "rgba(255,255,255,0.05)",
    danger: "#E5484D",
  },
  light: {
    // "PEARL": placeholder until we design it properly
    background: "#F6F5F2",
    surface: "#FFFFFF",
    surfaceRaised: "#EFEDE8",
    text: "#121214",
    mutedText: "#6B6F76",
    primary: "#D6DBE4",
    border: "rgba(0,0,0,0.08)",
    borderStrong: "rgba(0,0,0,0.16)",
    chrome: ["#FFFFFF", "#C9CDD3", "#8C919A", "#EEF0F3", "#A3A8B0", "#FFFFFF"],
    onChrome: "#0A0A0C",
    glass: "rgba(255,255,255,0.6)",
    monogram: "rgba(0,0,0,0.05)",
    danger: "#D92D20",
  },
};

type ThemeContextValue = {
  scheme: Scheme;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // light | dark | null
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [isLoading, setIsLoading] = useState(true);

  // load the saved choice (if any)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") {
          setPreferenceState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS, pref);
    } catch (error) {
      // not saved, but the theme still changes for this session
    }
  }

  const scheme: Scheme =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  return (
    <ThemeContext.Provider
      value={{
        scheme,
        colors: themes[scheme],
        preference,
        setPreference,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}

// Two small things I noticed

// Since isLoading exists, keep the splash screen up until it’s false. Otherwise a luxe dark app can flash the light theme for a split second on launch, which kills the premium feel.
// Your primary was the button color. In this system the button becomes chrome, and primary shifts to a soft icy-blue accent used for links, focus rings and the glow behind inputs.
