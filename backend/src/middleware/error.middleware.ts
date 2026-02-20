import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { logger } from "../lib/logger";
import { AppError } from "../utils/app-error";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      issues: err.flatten().fieldErrors
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "File exceeds 10MB size limit" });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled server error");
  res.status(500).json({ message: "Internal server error" });
}
