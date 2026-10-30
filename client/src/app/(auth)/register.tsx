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

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register, login } = useAuth();
  const router = useRouter();

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (!email.trim() || !username.trim() || !password) {
      return "Please fill in every field.";
    }
    if (!/^[A-Za-z0-9_]{3,23}$/.test(username.trim())) {
      return "Username must be 3–23 characters: letters, numbers, underscores.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return null;
  }

  async function handleSubmit() {
    if (submitting) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
      });
      // REGISTER doesn't log in, do it now with same credentials
      await login({ email: email.trim(), password });
    } catch (error) {
      setError(
        error instanceof ApiError ? error.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking your tasks and habits"
    >
      <LuxInput
        label="Email"
        value={email}
        tone="blue"
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => usernameRef.current?.focus()}
      />
      <LuxInput
        ref={usernameRef}
        label="Username"
        tone="blue"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <LuxInput
        ref={passwordRef}
        label="Password (min 8 characters)"
        tone="blue"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
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
        label="Create Account"
        tone="blue"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.button}
      />

      <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
        <Text style={[styles.link, { color: colors.mutedText }]}>
          Already have an account?{" "}
          <Text style={{ color: "#00FFFF", fontFamily: fonts.bodyStrong }}>
            Log in
          </Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  button: { marginTop: 32 },
  link: {
    fontFamily: fonts.body,
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});
