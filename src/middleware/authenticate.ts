import type { NextFunction, Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository.js";
import { verifyAccessToken } from "../utils/token.js";

const users = new UserRepository();

export const authenticate = async (
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
    const payload = verifyAccessToken(token);
    const user = await users.findById(payload.sub);
    if (!user || user.isDisabled) {
      return res.status(401).json({
        error: {
          code: "ACCOUNT_UNAVAILABLE",
          message: "Account is unavailable"
        }
      });
    }

    req.user = {
      sub: user.id,
      email: user.email,
      roles: user.roles
    };
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
