import { RowDataPacket } from "mysql2";
import db from "../database/db";

export async function userOwnsHabit(habitId: number, userId: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM habit WHERE id = ? AND user_id = ?`,
    [habitId, userId],
  );
  return rows.length > 0;
}
