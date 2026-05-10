export type Role = "user" | "admin";

export type Permission = "users:read" | "users:write" | "admin:read";

export const rolePermissions: Record<Role, Permission[]> = {
  user: ["users:read"],
  admin: ["users:read", "users:write", "admin:read"]
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  isEmailVerified: boolean;
  isDisabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type StoredUser = PublicUser & {
  passwordHash: string;
};

export type StoredRefreshSession = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  replacedBySessionId?: string;
};

export type StoredPasswordReset = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  roles: Role[];
};
