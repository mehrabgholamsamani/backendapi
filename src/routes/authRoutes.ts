import { Router } from "express";
import { env } from "../config/env.js";
import { PasswordResetRepository } from "../repositories/passwordResetRepository.js";
import { SessionRepository } from "../repositories/sessionRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema
} from "../schemas/authSchemas.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateRefreshToken, hashRefreshToken } from "../utils/refreshToken.js";
import { signAccessToken } from "../utils/token.js";
import type { PublicUser } from "../types/auth.js";

const router = Router();
const users = new UserRepository();
const sessions = new SessionRepository();
const passwordResets = new PasswordResetRepository();

const issueTokenPair = async (user: PublicUser) => {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await sessions.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    refreshTokenExpiresAt: expiresAt
  };
};

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
    const tokens = await issueTokenPair(publicUser);

    res.status(201).json({
      user: publicUser,
      ...tokens
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
    if (user.isDisabled) {
      throw new AppError(403, "Account is disabled", "ACCOUNT_DISABLED");
    }

    const loggedInUser = await users.markLogin(user.id);
    const publicUser = users.toPublicUser(loggedInUser ?? user);
    const tokens = await issueTokenPair(publicUser);
    res.json({
      user: publicUser,
      ...tokens
    });
  })
);

router.post(
  "/refresh",
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const session = await sessions.findActiveByTokenHash(
      hashRefreshToken(req.body.refreshToken)
    );
    if (!session) {
      throw new AppError(
        401,
        "Refresh token is invalid or expired",
        "INVALID_REFRESH_TOKEN"
      );
    }

    const user = await users.findById(session.userId);
    if (!user) {
      await sessions.revoke(session.id);
      throw new AppError(401, "User no longer exists", "USER_NOT_FOUND");
    }
    if (user.isDisabled) {
      await sessions.revoke(session.id);
      throw new AppError(403, "Account is disabled", "ACCOUNT_DISABLED");
    }

    const publicUser = users.toPublicUser(user);
    const tokens = await issueTokenPair(publicUser);
    const replacement = await sessions.findActiveByTokenHash(
      hashRefreshToken(tokens.refreshToken)
    );

    await sessions.revoke(session.id, replacement?.id);

    res.json({
      user: publicUser,
      ...tokens
    });
  })
);

router.post(
  "/logout",
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const session = await sessions.findActiveByTokenHash(
      hashRefreshToken(req.body.refreshToken)
    );
    if (session) {
      await sessions.revoke(session.id);
    }

    res.status(204).send();
  })
);

router.post(
  "/password/forgot",
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await users.findByEmail(req.body.email);
    const response: {
      message: string;
      resetToken?: string;
      resetTokenExpiresAt?: string;
    } = {
      message: "If the account exists, a password reset token was created"
    };

    if (user && !user.isDisabled) {
      await passwordResets.revokeActiveForUser(user.id);

      const resetToken = generateRefreshToken();
      const expiresAt = new Date(
        Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000
      ).toISOString();

      await passwordResets.create({
        userId: user.id,
        tokenHash: hashRefreshToken(resetToken),
        expiresAt
      });

      response.resetToken = resetToken;
      response.resetTokenExpiresAt = expiresAt;
    }

    res.json(response);
  })
);

router.post(
  "/password/reset",
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const reset = await passwordResets.findActiveByTokenHash(
      hashRefreshToken(req.body.resetToken)
    );
    if (!reset) {
      throw new AppError(
        401,
        "Password reset token is invalid or expired",
        "INVALID_PASSWORD_RESET_TOKEN"
      );
    }

    const user = await users.findById(reset.userId);
    if (!user || user.isDisabled) {
      await passwordResets.markUsed(reset.id);
      throw new AppError(401, "Account is unavailable", "ACCOUNT_UNAVAILABLE");
    }

    await users.updatePassword(user.id, await hashPassword(req.body.password));
    await passwordResets.markUsed(reset.id);
    await sessions.revokeAllForUser(user.id);

    res.status(204).send();
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
