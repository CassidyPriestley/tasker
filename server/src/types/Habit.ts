import { RowDataPacket } from "mysql2";

export interface Habit extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  frequency: "daily" | "range";
  frequency_days_mask: number | null;
  generates_task: boolean;
  target_streak: number | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}
