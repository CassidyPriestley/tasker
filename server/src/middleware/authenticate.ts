import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import AppError from "../utils/AppError";
import { AuthPayload } from "../types/Auth";

const jwt_secret = process.env.JWT_SECRET;
if (!jwt_secret) {
  throw new Error("JWT_SECRET is undefined in enviroment variable");
}

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) {
    return next(new AppError("No token provided", 401));
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as AuthPayload;

    if (!decoded || typeof decoded !== "object" || !("id" in decoded)) {
      return next(new AppError("Invalid token payload", 401));
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return next(new AppError("Token expired", 401));
    }
    return next(new AppError("Invalid token", 401));
  }
};

export default authenticate;
