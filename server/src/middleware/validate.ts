import * as z from "zod";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

export const validate =
  (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
    // PARSE req.body AGAINST THE SCHEMA
    const result = schema.safeParse(req.body);

    // FAILS: PASS ERROR TO NEXT() SO ERROR MIDDLEWARE CATCHES IT
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      return next(new AppError(message, 400));
    }
    // SUCCEEDS: CALL NEXT() TO CONTINUE TO CONTROLLER
    req.body = result.data;
    next();
  };
