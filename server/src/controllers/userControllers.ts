import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import AppError from "../utils/AppError";
import db from "../database/db";
import { User } from "../types/User";
import { ResultSetHeader } from "mysql2";
import dotenv from "dotenv";
import cloudinary from "../utils/cloudinary";
dotenv.config();

const SALT_ROUNDS = 10;
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is undefined in environmental variables");
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 1000,
};

export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;

    let sql = `SELECT id, email, username, avatar_url, created_at, updated_at FROM users WHERE id = ?`;
    const [results] = await db.query<User[]>(sql, [userId]);

    if (results.length === 0) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json({ user: results[0] });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed getting user's profile", 500));
  }
};

export const updateUsername = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { username } = req.body;

    const sql = `UPDATE users SET username = ? WHERE id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [username, userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json({ message: "Username updated successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return next(new AppError("That username is already taken", 409));
    }
    return next(new AppError("Failed to update username", 500));
  }
};

export const updateEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { email } = req.body;

    const sql = `UPDATE users SET email = ? WHERE id = ?`;
    await db.query<ResultSetHeader>(sql, [email, userId]);

    return res.status(200).json({ message: "Email updated successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return next(new AppError("That email is already taken", 409));
    }
    return next(new AppError("Failed to update email", 500));
  }
};

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { new_password, current_password } = req.body;

    const sql = `SELECT password_hash FROM users WHERE id = ?`;
    const [results] = await db.query<User[]>(sql, [userId]);

    if (results.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(
      current_password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      return next(new AppError("Invalid password", 403));
    }

    const hashedNewPassword = await bcrypt.hash(new_password, SALT_ROUNDS);
    const updateSql = `UPDATE users SET password_hash = ? WHERE id = ?`;
    await db.query<ResultSetHeader>(updateSql, [hashedNewPassword, userId]);

    return res.status(200).json({ message: "Password successfully updated" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to update password", 500));
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    const sql = `SELECT password_hash FROM users WHERE id = ?`;
    const [results] = await db.query<User[]>(sql, [userId]);

    if (results.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return next(new AppError("Invalid password", 403));
    }

    const deleteSql = `DELETE FROM users WHERE id = ?`;
    await db.query<ResultSetHeader>(deleteSql, [userId]);
    return res
      .clearCookie("token", cookieOptions)
      .status(200)
      .json({ message: "Account successfully deleted" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to delete account", 500));
  }
};

// AVATAR CONTROLLERS
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return next(new AppError("No image file provided", 400));
    }

    // UPLOAD BUFFER TO CLOUDINARY VIA A STREAM (NO TEMP FILE NEEDED)
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "avatars",
            resource_type: "image",
            public_id: `user_${userId}`,
            overwrite: true,
            invalidate: true,
          },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
          },
        );
        stream.end(req.file!.buffer);
      },
    );

    const sql = `UPDATE users SET avatar_url = ? WHERE id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [
      uploadResult.secure_url,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json({
      message: "Avatar uploaded successfully",
      avatarUrl: uploadResult.secure_url,
    });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to upload avatar", 500));
  }
};

export const deleteAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;

    const sql = `UPDATE users SET avatar_url = NULL WHERE id = ?`;
    const [result] = await db.query<ResultSetHeader>(sql, [userId]);

    if (result.affectedRows === 0) {
      return next(new AppError("User not found", 404));
    }

    try {
      await cloudinary.uploader.destroy(`avatars/user_${userId}`, {
        invalidate: true,
      });
    } catch (error) {
      console.error("Cloudinary avatar cleanup failed:", error);
    }

    res.status(200).json({ message: "Avatar removed successfully" });
  } catch (error) {
    console.error(error);
    return next(new AppError("Failed to remove avatar", 500));
  }
};
