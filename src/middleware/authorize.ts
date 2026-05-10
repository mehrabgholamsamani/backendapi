import type { NextFunction, Request, Response } from "express";
import { rolePermissions, type Permission, type Role } from "../types/auth.js";

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.some((role) => req.user?.roles.includes(role))) {
      return forbidden(res);
    }

    return next();
  };

export const requirePermission =
  (...permissions: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = new Set(
      req.user?.roles.flatMap((role) => rolePermissions[role]) ?? []
    );

    if (!permissions.every((permission) => userPermissions.has(permission))) {
      return forbidden(res);
    }

    return next();
  };

const forbidden = (res: Response) =>
  res.status(403).json({
    error: {
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource"
    }
  });
