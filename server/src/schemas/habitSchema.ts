import { z } from "zod";
import { DAY_NAMES } from "../utils/dayMask";

const hexColor = /^#[0-9A-Fa-f]{6}$/;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

const baseHabitFields = {
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().trim().max(65535).nullable().optional(),
  frequency: z.enum(["daily", "range"]),
  days: z.array(z.enum(DAY_NAMES)).optional(),
  generates_task: z.boolean(),
  target_streak: z
    .number()
    .int()
    .positive("target_streak must be a positive integer")
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(hexColor, "color must be a hex value like #A1B2C3")
    .nullable()
    .optional(),
  icon: z.string().trim().max(50).nullable().optional(),
};

const applyFrequencyRefinement = <T extends z.ZodType>(schema: T) =>
  schema.refine(
    (data: any) =>
      data.frequency !== "range" ||
      (data.days !== undefined && data.days.length > 0),
    {
      message: "At least one day must be selected when frequency is 'range'",
      path: ["days"],
    },
  );

export const createHabitSchema = applyFrequencyRefinement(
  z.object({
    ...baseHabitFields,
    frequency: baseHabitFields.frequency.default("daily"),
    generates_task: baseHabitFields.generates_task.default(false),
  }),
);

export const updateHabitSchema = applyFrequencyRefinement(
  z
    .object(baseHabitFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "No valid fields provided to update",
    }),
);

export const generateTaskSchema = z
  .object({
    due_date: z
      .string()
      .regex(dateOnly, "due_date must be in YYYY-MM-DD format")
      .refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "due_date must be a valid date",
      })
      .optional(),
  })
  .default({});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type EditHabitInput = z.infer<typeof updateHabitSchema>;
export type GenerateTaskInput = z.infer<typeof generateTaskSchema>;
