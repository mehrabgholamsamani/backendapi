import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/authorize.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { SessionRepository } from "../repositories/sessionRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import {
  updateUserRolesSchema,
  updateUserStatusSchema,
  userIdParamsSchema
} from "../schemas/adminSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";

const router = Router();
const users = new UserRepository();
const sessions = new SessionRepository();

const getUserId = (id: string | string[]) => (Array.isArray(id) ? id[0] : id);

router.get(
  "/users",
  authenticate,
  requirePermission("admin:read"),
  asyncHandler(async (_req, res) => {
    const allUsers = await users.findAll();
    res.json({ users: allUsers.map((user) => users.toPublicUser(user)) });
  })
);

router.patch(
  "/users/:id/roles",
  authenticate,
  requirePermission("users:write"),
  validateRequest(updateUserRolesSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req.params.id);

    if (userId === req.user?.sub && !req.body.roles.includes("admin")) {
      throw new AppError(
        400,
        "You cannot remove your own admin role",
        "SELF_ADMIN_ROLE_REQUIRED"
      );
    }

    const user = await users.updateRoles(userId, req.body.roles);
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    res.json({ user: users.toPublicUser(user) });
  })
);

router.patch(
  "/users/:id/status",
  authenticate,
  requirePermission("users:write"),
  validateRequest(updateUserStatusSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req.params.id);

    if (userId === req.user?.sub && req.body.isDisabled) {
      throw new AppError(
        400,
        "You cannot disable your own account",
        "SELF_DISABLE_FORBIDDEN"
      );
    }

    const user = await users.setDisabled(userId, req.body.isDisabled);
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    if (user.isDisabled) {
      await sessions.revokeAllForUser(user.id);
    }

    res.json({ user: users.toPublicUser(user) });
  })
);

router.delete(
  "/users/:id",
  authenticate,
  requirePermission("users:write"),
  validateRequest(userIdParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req.params.id);

    if (userId === req.user?.sub) {
      throw new AppError(
        400,
        "You cannot delete your own account",
        "SELF_DELETE_FORBIDDEN"
      );
    }

    const deleted = await users.delete(userId);
    if (!deleted) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    await sessions.revokeAllForUser(userId);
    res.status(204).send();
  })
);

export { router as adminRouter };
