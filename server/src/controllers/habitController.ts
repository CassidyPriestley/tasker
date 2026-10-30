import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import db from "../database/db";
import { ResultSetHeader } from "mysql2";
import { Habit } from "../types/Habit";
import { parseId } from "../utils/parseId";
import { dayNamesToMask, maskToDayNames } from "../utils/dayMask";
import { GenerateTaskInput } from "../schemas/habitSchema";

export const createHabit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      frequency,
      days,
      generates_task,
      target_streak,
      color,
      icon,
    } = req.body;

    const frequency_days_mask = days ? dayNamesToMask(days) : null;

    const sql = `INSERT INTO habit
      (user_id, title, description, frequency, frequency_days_mask, generates_task, target_streak, color, icon)
      VALUES (?,?,?,?,?,?,?,?,?)`;

    const [result] = await db.query<ResultSetHeader>(sql, [
      userId,
      title,
      description ?? null,
      frequency ?? "daily",
      frequency_days_mask,
      generates_task ?? false,
      target_streak ?? null,
      color ?? null,
      icon ?? null,
    ]);

    if (!result.insertId || result.affectedRows === 0) {
      return next(new AppError("Habit not created", 500));
    }

    return res.status(201).json({
      message: "Habit successfully created",
      habitId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to create habit", 500));
  }
};

export const getHabits = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { frequency, generates_task, include_archived } = req.query;

    let sql = `SELECT * FROM habit WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (include_archived !== "true") {
      sql += ` AND archived_at IS NULL`;
    }

    if (frequency) {
      if (!["daily", "range"].includes(frequency as any)) {
        return next(new AppError("Invalid habit frequency", 400));
      }
      sql += ` AND frequency = ?`;
      params.push(frequency as string);
    }

    if (generates_task) {
      if (!["true", "false"].includes(generates_task as string)) {
        return next(new AppError("Invalid generate task filter", 400));
      }
      sql += ` AND generates_task = ?`;
      params.push(generates_task === "true" ? 1 : 0);
    }

    sql += ` ORDER BY created_at DESC`;
    const [habits] = await db.query<Habit[]>(sql, params);

    const habitsWithDays = habits.map((habit) => ({
      ...habit,
      days: habit.frequency_days_mask
        ? maskToDayNames(habit.frequency_days_mask)
        : null,
    }));

    return res.status(200).json({ habits: habitsWithDays });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed getting habits", 500));
  }
};

export const getHabitById = async (
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

    let sql = `SELECT * FROM habit WHERE id = ? AND user_id = ?`;
    const [results] = await db.query<Habit[]>(sql, [habitId, userId]);

    if (results.length === 0) {
      return next(new AppError("Habit not found", 404));
    }

    const habit = results[0];
    const days = habit.frequency_days_mask
      ? maskToDayNames(habit.frequency_days_mask)
      : null;

    return res.status(200).json({ habit: { ...habit, days } });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to get habit by id", 500));
  }
};

export const updateHabit = async (
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

    const { days, ...rest } = req.body;
    const bodyToUpdate: Record<string, unknown> = { ...rest };

    if (days !== undefined) {
      bodyToUpdate.frequency_days_mask = dayNamesToMask(days);
    }

    const allowedFields = [
      "title",
      "description",
      "frequency",
      "frequency_days_mask",
      "generates_task",
      "target_streak",
      "color",
      "icon",
    ] as const;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of allowedFields) {
      if (bodyToUpdate[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(bodyToUpdate[field] as string | number | null);
      }
    }

    const sql = `UPDATE habit SET ${updates.join(", ")} WHERE id = ? AND user_id = ? AND archived_at IS NULL`;
    values.push(habitId, userId);
    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      return next(new AppError("Habit not found", 404));
    }

    return res.status(200).json({ message: "Habit successfully updated" });
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to update habit", 500));
  }
};

export const archiveHabit = async (
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

    const sql = `UPDATE habit SET archived_at = NOW() WHERE id = ? AND user_id = ? AND archived_at IS NULL`;
    const [result] = await db.query<ResultSetHeader>(sql, [habitId, userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("Habit was not found", 404));
    }

    return res.status(200).json({ message: "Habit successfully archived" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to archive habit", 500));
  }
};

export const restoreHabit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const habitId = parseId(req.params.id);

    if (habitId === null) {
      return next(new AppError("Habit id is invalid", 400));
    }

    const sql = `UPDATE habit SET archived_at = NULL WHERE id = ? AND user_id = ? AND archived_at IS NOT NULL`;
    const [result] = await db.query<ResultSetHeader>(sql, [habitId, userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("Archived habit not found", 404));
    }

    return res
      .status(200)
      .json({ message: "Archived habit successfully restored" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Archived habit could not be restored", 500));
  }
};

export const deleteHabit = async (
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

    const sql = `DELETE FROM habit WHERE id = ? AND user_id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [habitId, userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("Habit not found", 404));
    }

    return res.status(200).json({ message: "Habit deleted successfully" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to delete habit", 500));
  }
};

export const generateTaskFromHabit = async (
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

    const sql = `SELECT * FROM habit WHERE id = ? AND user_id = ? AND archived_at IS NULL`;
    const [results] = await db.query<Habit[]>(sql, [habitId, userId]);

    if (results.length === 0) {
      return next(new AppError("Habit not found", 404));
    }

    const habit = results[0];
    if (!habit.generates_task) {
      return next(
        new AppError("This habit is not set up to generate tasks", 400),
      );
    }

    const { due_date } = req.body as GenerateTaskInput;
    const dueDate = due_date ?? new Date().toISOString().slice(0, 10);

    const insertSql = `INSERT into task (user_id, title, task_description, priority, due_date, habit_id) VALUES (?,?,?,?,?,?)`;
    const [result] = await db.query<ResultSetHeader>(insertSql, [
      userId,
      habit.title,
      habit.description ?? null,
      "medium",
      dueDate,
      habit.id,
    ]);

    if (!result.insertId || result.affectedRows === 0) {
      return next(new AppError("Task not created", 500));
    }

    return res.status(201).json({
      message: "Task successfully generated from habit",
      taskId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to generate task from habit", 500));
  }
};
