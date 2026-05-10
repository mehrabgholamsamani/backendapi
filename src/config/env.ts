import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long")
    .default("development-secret-change-me-32chars"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  DATA_FILE: z.string().default("./data/users.json"),
  SESSION_FILE: z.string().default("./data/sessions.json"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30)
});

export const env = envSchema.parse(process.env);
