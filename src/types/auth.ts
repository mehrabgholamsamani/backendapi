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
  createdAt: string;
};

export type StoredUser = PublicUser & {
  passwordHash: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  roles: Role[];
};
