import * as z from "zod";

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createHabitLogSchema = z.object({
  completed_at: z
    .string()
    .regex(dateOnlyRegex, "completed_at must be in YYYY-MM-DD format")
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "completed_at must be valid date",
    })
    .optional(),
});

export type CreateHabitLogInput = z.infer<typeof createHabitLogSchema>;
