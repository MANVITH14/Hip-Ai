import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes";
import uploadRoutes from "./routes/upload.routes";
import analyzeRoutes from "./routes/analyze.routes";
import healthRoutes from "./routes/health.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { httpLogger } from "./lib/logger";

export const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);
app.use("/analyze", analyzeRoutes);
app.use("/health", healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
