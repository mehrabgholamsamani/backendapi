import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/authorize.js";
import { UserRepository } from "../repositories/userRepository.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const users = new UserRepository();

router.get(
  "/users",
  authenticate,
  requirePermission("admin:read"),
  asyncHandler(async (_req, res) => {
    const allUsers = await users.findAll();
    res.json({ users: allUsers.map((user) => users.toPublicUser(user)) });
  })
);

export { router as adminRouter };
