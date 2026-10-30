// AUTH
export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

// USERS
export type User = {
  id: number;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

// TASKS
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: number;
  title: string;
  task_description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  habit_id: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateTaskInput = {
  title: string;
  task_description?: string;
  priority?: TaskPriority;
  due_date?: string;
  habit_id?: number | null;
};
// ACCEPTS ANY SUBSET OF THE CREATE FIELD
export type UpdateTaskInput = Partial<CreateTaskInput>;

// HABITS
export type HabitFrequency = "daily" | "range";

export type DayName =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type Habit = {
  id: number;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  days: DayName[] | null; // null for daily habits
  generates_task: boolean;
  target_streak: number | null;
  color: string | null;
  icon: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateHabitInput = {
  title: string;
  description?: string | null; // null clears it when editing
  frequency?: HabitFrequency;
  days?: DayName[]; // REQUIRED WHEN FREQUENCY IS RANGE
  generates_task?: boolean;
  target_streak?: number | null;
  color?: string | null;
  icon?: string | null;
};

export type UpdateHabitInput = Partial<CreateHabitInput>;

// HABIT LOGS
export type HabitLog = {
  id: number;
  habit_id: number;
  completed_at: string;
};
