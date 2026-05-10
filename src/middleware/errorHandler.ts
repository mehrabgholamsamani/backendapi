import type { ErrorRequestHandler, RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId
    }
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: req.requestId
      }
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : error.message,
      requestId: req.requestId
    }
  });
};
