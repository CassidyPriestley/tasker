import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import { MulterError } from "multer";

const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof MulterError) {
    req.log.warn(`Multer error: ${err.message}`);

    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Max size is 5MB"
        : "File upload error";

    return res.status(400).json({ message });
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : "Internal server error";

  if (isAppError && err.isOperational) {
    req.log.warn(`Operational error: ${err.message}`);
  } else {
    req.log.error({ err, statusCode }, "Unexpected error");
  }

  res.status(statusCode).json({ message });
};

export default errorHandler;
