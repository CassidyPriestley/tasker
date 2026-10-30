import * as z from "zod";

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(23, "Username cannot exceed 23 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
});

export const updateEmailSchema = z.object({
  email: z.email().trim().max(255, "Email cannot exceed 255 characters"),
});

export const updatePasswordSchema = z.object({
  current_password: z.string().trim().min(1, "Current password is required"),
  new_password: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters or more")
    .max(100, "Password cannot exceed 100 characters"),
});

export const deleteAccountSchema = z.object({
  password: z.string().trim().min(1, "Password is required"),
});
