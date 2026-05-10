import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthTokenPayload, PublicUser } from "../types/auth.js";

export const signAccessToken = (user: PublicUser) => {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    roles: user.roles
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  });
};

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
