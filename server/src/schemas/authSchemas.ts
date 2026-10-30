import * as z from "zod";

export const registerSchema = z.object({
  email: z.email().trim().max(255, "Email must not exceed 255 characters"),
  username: z
    .string()
    .trim()
    .min(3, "Username must at least 3 characters")
    .max(23, "Username cannot exceed 23 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  password: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters or more")
    .max(100, "Password cannot exceed 100 characters"),
});

export const loginSchema = z.object({
  email: z.email().trim().max(255, "Email cannot exceed 255 characters"),
  password: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters or more")
    .max(100, "Password cannot exceed 100 characters"),
});
