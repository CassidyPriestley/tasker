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
  uri: string; //       where the picked photo lives on the phone
  mimeType?: string; // e.g. "image/jpeg"
  fileName?: string | null;
};

// The server uses multer, which reads a *file* from a multipart form,
// not JSON. So we send FormData with the photo in a field named "avatar".
export function uploadAvatar(file: AvatarFile) {
  const form = new FormData();
  // React Native's FormData accepts { uri, name, type } as a file;
  // the cast is because TypeScript only knows the browser's Blob type
  form.append("avatar", {
    uri: file.uri,
    name: file.fileName ?? "avatar.jpg",
    type: file.mimeType ?? "image/jpeg",
  } as unknown as Blob);

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
