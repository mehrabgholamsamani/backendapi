import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

const rateLimitHandler = (message: string) => (req: Request, res: Response) =>
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message,
      requestId: req.requestId
    }
  });

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler("Too many requests")
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler("Too many authentication attempts")
});
