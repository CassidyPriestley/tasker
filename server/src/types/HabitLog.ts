import { RowDataPacket } from "mysql2";

export interface HabitLog extends RowDataPacket {
  id: number;
  habit_id: number;
  user_id: number;
  completed_at: string;
  created_at: string;
}
