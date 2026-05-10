import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimiters.js";
import { requestContext } from "./middleware/requestContext.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(globalLimiter);

  if (env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/ready", (_req, res) => {
    res.json({
      status: "ready",
      uptime: process.uptime(),
      environment: env.NODE_ENV
    });
  });
  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
