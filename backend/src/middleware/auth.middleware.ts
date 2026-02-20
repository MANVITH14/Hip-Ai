import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next(new AppError("Missing or invalid authorization header", 401));
    return;
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
      userId: string;
      email: string;
    };
    req.user = payload;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}
