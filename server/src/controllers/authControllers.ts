import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../database/db";
import { User } from "../types/User";
import { ResultSetHeader } from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const SALT_ROUNDS = 10;
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is undefined in enviromental variables");
}
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 1000,
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, username, password } = req.body;
    let hashedPassword: string;

    try {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    } catch (err) {
      console.error(err);
      return next(new AppError("Failed to hash password", 500));
    }

    const sql = `INSERT INTO users (email, username, password_hash, password_algo) VALUES (?,?,?,?)`;
    const [result] = await db.query<ResultSetHeader>(sql, [
      email,
      username,
      hashedPassword,
      "bcrypt",
    ]);

    if (!result.insertId || result.affectedRows === 0) {
      return next(new AppError("User not created", 500));
    }
    return res.status(201).json({
      message: "User successfully created",
      userId: result.insertId,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      const message = error.message || "";
      if (message.includes("email")) {
        return next(new AppError("This email is already registered", 409));
      }
      if (message.includes("username")) {
        return next(new AppError("This username is already registered", 409));
      }
      return next(
        new AppError("A duplicate record is already registered", 409),
      );
    }
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError("Failed to create user", 500));
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const sql = `SELECT * FROM users WHERE email = ?`;
    const [results] = await db.query<User[]>(sql, [email]);

    if (results.length === 0) {
      return next(new AppError("Invalid email or password", 401));
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "1hr" });

    return res
      .cookie("token", token, cookieOptions)
      .json({ message: "User successfully logged in" });
  } catch (err) {
    return next(new AppError("Failed to log in user", 500));
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    return res.clearCookie("token", cookieOptions).status(200).json({
      message: "User successfully logged out",
    });
  } catch (error) {
    return next(new AppError("Failed to log out user", 500));
  }
};
