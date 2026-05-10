import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/token.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.header("authorization");
  const [scheme, token] = header?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Bearer token is required"
      }
    });
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Token is invalid or expired"
      }
    });
  }
};
