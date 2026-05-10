import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(320),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(128)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(128)
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(32)
  })
});
