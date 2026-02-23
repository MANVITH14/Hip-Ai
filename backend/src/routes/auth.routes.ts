import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? null,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: "User registered",
      user
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const validPassword = await bcrypt.compare(payload.password, user.passwordHash);

    if (!validPassword) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
