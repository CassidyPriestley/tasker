// The round profile picture on the Today screen.
// Tap it to choose a new photo (uploaded to Cloudinary by the server) or remove it.

import { fonts } from "@/constants/fonts";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { showMessage } from "@/lib/dialogs";
import { getErrorMessage } from "@/lib/errors";
import { deleteAvatar, uploadAvatar } from "@/lib/services/users";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SIZE = 48;

export function AvatarButton() {
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  // Runs an upload/remove with the spinner on, then reloads the user
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await refreshUser();
    } catch (error) {
      showMessage("Couldn't update your photo", getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function choosePhoto() {
    // iOS's photo picker runs outside the app, so it needs no permission prompt
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true, // lets them crop…
      aspect: [1, 1], // to a square, since the avatar is a circle
      quality: 0.7, // smaller file = faster upload; still looks sharp
    });
    if (result.canceled) return;

    const photo = result.assets[0];
    await run(() =>
      uploadAvatar({
        uri: photo.uri,
        mimeType: photo.mimeType,
        fileName: photo.fileName,
      }),
    );
  }

  function openMenu() {
    if (busy) return;
    if (Platform.OS === "web") {
      choosePhoto();
      return;
    }
    Alert.alert("Profile photo", undefined, [
      { text: "Choose photo", onPress: choosePhoto },
      ...(user?.avatar_url
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: () => run(deleteAvatar),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <Pressable
      onPress={openMenu}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={[styles.avatar, { borderColor: colors.borderStrong }]}
    >
      {user?.avatar_url ? (
        <Image
          source={user.avatar_url}
          style={styles.image}
          transition={200} // fades in instead of popping
        />
      ) : (
        <Text style={[styles.letter, { color: colors.text }]}>
          {(user?.username ?? "?").charAt(0).toUpperCase()}
        </Text>
      )}

      {busy ? (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  letter: {
    fontFamily: fonts.display,
    fontSize: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
});
