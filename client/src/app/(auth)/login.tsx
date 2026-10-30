import { AuthShell } from "@/components/auth/AuthShell";
import { GlowButton } from "@/components/ui/GlowButton";
import { LuxInput } from "@/components/ui/LuxInput";
import { fonts } from "@/constants/fonts";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ApiError } from "@/lib/api";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      // SUCCESS: User is set, Stack.Protected redirects to (tabs)
    } catch (error) {
      setError(
        error instanceof ApiError ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Log in to keep your tasks and habits going"
    >
      <LuxInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <LuxInput
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      {error && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.danger }]}
        >
          {error}
        </Text>
      )}
      <GlowButton
        label="Log in"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.button}
      />

      <Pressable onPress={() => router.replace("/register")} hitSlop={8}>
        <Text style={[styles.link, { color: colors.mutedText }]}>
          Don't have an account yet?{" "}
          <Text style={{ color: "#2EE59D", fontFamily: fonts.bodyStrong }}>
            Create one
          </Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 15, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  button: {
    marginTop: 32,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: {
    fontFamily: fonts.body,
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});
