import { Router } from "express";
import { UserRepository } from "../repositories/userRepository.js";
import { loginSchema, registerSchema } from "../schemas/authSchemas.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/token.js";

const router = Router();
const users = new UserRepository();

router.post(
  "/register",
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const existingUser = await users.findByEmail(req.body.email);
    if (existingUser) {
      throw new AppError(409, "Email is already registered", "EMAIL_EXISTS");
    }

    const passwordHash = await hashPassword(req.body.password);
    const user = await users.create({
      email: req.body.email,
      name: req.body.name,
      passwordHash
    });
    const publicUser = users.toPublicUser(user);

    res.status(201).json({
      user: publicUser,
      accessToken: signAccessToken(publicUser)
    });
  })
);

router.post(
  "/login",
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await users.findByEmail(req.body.email);
    const validPassword =
      user && (await verifyPassword(req.body.password, user.passwordHash));

    if (!user || !validPassword) {
      throw new AppError(401, "Invalid email or password", "INVALID_LOGIN");
    }

    const publicUser = users.toPublicUser(user);
    res.json({
      user: publicUser,
      accessToken: signAccessToken(publicUser)
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await users.findById(req.user!.sub);
    if (!user) {
      throw new AppError(401, "User no longer exists", "USER_NOT_FOUND");
    }

    res.json({ user: users.toPublicUser(user) });
  })
);

export { router as authRouter };
