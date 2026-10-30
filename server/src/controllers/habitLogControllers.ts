import { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Request, Response, NextFunction } from "express";
import { parseId } from "../utils/parseId";
import AppError from "../utils/AppError";
import db from "../database/db";
import { HabitLog } from "../types/HabitLog";
import { userOwnsHabit } from "../utils/ownership";

interface CountRow extends RowDataPacket {
  count: number;
}

export const createHabitLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const habitId = parseId(req.params.id);
    if (habitId === null) {
      return next(new AppError("Invalid habit id", 400));
    }

    if (!(await userOwnsHabit(habitId, Number(userId)))) {
      return next(new AppError("Habit not found", 404));
    }

    const { completed_at } = req.body;

    // DEFAULT TO TODAY'S DATE IF NO DATE FROM CLIENT
    const logDate = completed_at ?? new Date().toISOString().slice(0, 10);

    const sql = `INSERT INTO habit_log (habit_id, user_id, completed_at) VALUES (?,?,?)`;
    const [result] = await db.query<ResultSetHeader>(sql, [
      habitId,
      userId,
      logDate,
    ]);

    if (!result.insertId || result.affectedRows === 0) {
      return next(new AppError("Habit log not created", 500));
    }

    return res.status(201).json({
      message: "Habit log successfully created",
      habitLogId: result.insertId,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return next(new AppError("Referenced habit does not exist", 400));
    }
    if (error.code === "ER_DUP_ENTRY") {
      return next(
        new AppError("This habit is already logged for that date", 409),
      );
    }
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to create habit log", 500));
  }
};

export const getHabitLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { start, end } = req.query;
    const habitId = parseId(req.params.id);

    if (habitId === null) {
      return next(new AppError("Invalid habit id", 400));
    }

    let sql = `SELECT * FROM habit_log where habit_id = ? AND user_id = ?`;
    const params: (string | number)[] = [habitId, userId];

    if (start) {
      sql += ` AND completed_at >= ?`;
      params.push(start as string);
    }
    if (end) {
      sql += ` AND completed_at <= ?`;
      params.push(end as string);
    }
    sql += ` ORDER BY completed_at DESC`;

    const [logs] = await db.query<HabitLog[]>(sql, params);
    return res.status(200).json({ logs });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed getting habit logs", 500));
  }
};

export const deleteHabitLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const logId = parseId(req.params.logId);
    if (logId === null) {
      return next(new AppError("Habit log id is invalid", 400));
    }

    const sql = `DELETE FROM habit_log WHERE id = ? AND user_id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [logId, userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("Habit log not found", 404));
    }

    return res.status(200).json({ message: "Habit log successfully deleted" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed deleting habit log", 500));
  }
};

export const getHabitLogCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const habitId = parseId(req.params.id);

    if (habitId === null) {
      return next(new AppError("Invalid habit id", 400));
    }

    const sql = `SELECT COUNT(*) AS count FROM habit_log WHERE habit_id = ? AND user_id = ?`;
    const [rows] = await db.query<CountRow[]>(sql, [habitId, userId]);

    return res.status(200).json({ count: rows[0].count });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed getting habit log count", 500));
  }
};
