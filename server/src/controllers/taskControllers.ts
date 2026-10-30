import type { Request, Response, NextFunction } from "express";
import db from "../database/db";
import { ResultSetHeader } from "mysql2";
import AppError from "../utils/AppError";
import { Task } from "../types/Task";
import { parseId } from "../utils/parseId";
import { userOwnsHabit } from "../utils/ownership";

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { title, task_description, priority, due_date, habit_id } = req.body;

    if (habit_id != null && !(await userOwnsHabit(habit_id, Number(userId)))) {
      return next(new AppError("Habit not found", 404));
    }

    const sql = `INSERT INTO task (user_id, title, task_description, priority, due_date, habit_id) VALUES (?,?,?,?,?,?)`;
    const [result] = await db.query<ResultSetHeader>(sql, [
      userId,
      title,
      task_description ?? null,
      priority ?? "medium",
      due_date ?? null,
      habit_id ?? null,
    ]);

    if (!result.insertId || result.affectedRows === 0) {
      return next(new AppError("Task not created", 500));
    }

    return res.status(201).json({
      message: "Task successfully created",
      taskId: result.insertId,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return next(new AppError("Reference habit does not exist", 400));
    }

    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to create task", 500));
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { status, priority } = req.query;

    let sql = `SELECT * FROM task WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (status) {
      if (!["pending", "in_progress", "completed"].includes(status as string)) {
        return next(new AppError("Invalid status filter", 400));
      }
      sql += ` AND status = ?`;
      params.push(status as string);
    }

    if (priority) {
      if (!["low", "medium", "high"].includes(priority as string)) {
        return next(new AppError("Invalid priority filter", 400));
      }
      sql += ` AND priority = ?`;
      params.push(priority as string);
    }

    sql += ` ORDER BY created_at DESC`;

    const [tasks] = await db.query<Task[]>(sql, params);

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to fetch tasks", 500));
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const taskId = parseId(req.params.id);

    if (taskId === null) {
      return next(new AppError("Invalid task id", 400));
    }

    let sql = `SELECT * FROM task WHERE id = ? AND user_id = ?`;
    const [results] = await db.query<Task[]>(sql, [taskId, userId]);

    if (results.length === 0) {
      return next(new AppError("Task not found", 404));
    }

    return res.status(200).json({ task: results[0] });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to get task by id", 500));
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return next(new AppError("Invalid task id", 400));
    }
    const allowedFields = [
      "title",
      "task_description",
      "priority",
      "due_date",
      "habit_id",
    ] as const;

    if (
      req.body.habit_id != null &&
      !(await userOwnsHabit(req.body.habit_id, Number(userId)))
    ) {
      return next(new AppError("Habit not found", 404));
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return next(new AppError("No valid fields provided to update", 400));
    }

    const sql = `UPDATE task SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`;
    values.push(taskId, userId);
    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      return next(new AppError("Task not found", 404));
    }
    return res.status(200).json({ message: "Task successfully updated" });
  } catch (error: any) {
    console.error(error);
    if (error.code == "ER_NO_REFERENCED_ROW_2") {
      return next(new AppError("Referenced habit does not exist", 400));
    }
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to update task", 500));
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return next(new AppError("Invalid task id", 400));
    }

    const sql = `DELETE FROM task WHERE id = ? AND user_id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [taskId, userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("Task not found", 404));
    }

    return res.status(200).json({ message: "Task successfully deleted" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to delete task", 500));
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return next(new AppError("Invalid task id", 400));
    }
    const { status } = req.body;

    const sql = `UPDATE task SET status = ? WHERE id = ? AND user_id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [
      status,
      taskId,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return next(new AppError("Task not found", 404));
    }

    return res
      .status(200)
      .json({ message: "Task status successfully updated" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to update task status", 500));
  }
};
