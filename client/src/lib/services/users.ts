import { Platform } from "react-native";
import { api } from "../api";
import type { User } from "@/types";

type UpdatePasswordInput = {
  current_password: string;
  new_password: string;
};

export function getMe() {
  return api<{ user: User }>("/users/me");
}

export function updateUsername(username: string) {
  return api<{ message: string }>("/users/me/username", {
    method: "PUT",
    body: { username },
  });
}

export function updateEmail(email: string) {
  return api<{ message: string }>("/users/me/email", {
    method: "PUT",
    body: { email },
  });
}

export function updatePassword(input: UpdatePasswordInput) {
  return api<{ message: string }>("/users/me/password", {
    method: "PUT",
    body: input,
  });
}

export function deleteAccount(password: string) {
  return api<{ message: string }>("/users/me", {
    method: "DELETE",
    body: { password },
  });
}

export type AvatarFile = {
  uri: string; // where the picked photo lives on the phone
  mimeType?: string; // e.g. "image/jpeg"
  fileName?: string | null;
};

export async function uploadAvatar(file: AvatarFile) {
  const form = new FormData();
  const name = file.fileName ?? "avatar.jpg";

  if (Platform.OS === "web") {
    // WEB: the picked image is a blob/:data: URL, so fetch it to get the real file
    const blob = await (await fetch(file.uri)).blob();
    form.append("avatar", blob, name);
  } else {
    // React Native form data accepts (uri, name, type) as a file
    form.append("avatar", {
      uri: file.uri,
      name,
      type: file.mimeType ?? "image/jpeg",
    } as unknown as Blob);
  }
  return api<{ message: string; avatarUrl: string }>("/users/me/avatar", {
    method: "POST",
    body: form,
  });
}

export function deleteAvatar() {
  return api<{ message: string }>("/users/me/avatar", {
    method: "DELETE",
  });
}
