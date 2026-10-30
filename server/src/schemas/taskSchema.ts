import * as z from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  task_description: z.string().trim().max(5000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.iso.date("due_date must be in YYYY-MM-DD format").optional(),
  habit_id: z.number().positive().int().optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the task",
  });

export const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"], {
    message: "Status must be one of: pending, in_progress, completed",
  }),
});
