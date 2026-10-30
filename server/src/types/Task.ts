import { RowDataPacket } from "mysql2";

export interface Task extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  task_description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  habit_id: number | null;
  created_at: string;
  updated_at: string;
}
