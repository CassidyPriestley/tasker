import type { LoginInput, RegisterInput } from "@/types";
import { api } from "../api";

export function register(input: RegisterInput) {
  return api<{ message: String; userId: number }>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export function login(input: LoginInput) {
  return api<{ message: string }>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export function logout() {
  return api<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}
