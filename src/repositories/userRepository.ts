import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import type { PublicUser, Role, StoredUser } from "../types/auth.js";

type UserCreateInput = {
  email: string;
  name: string;
  passwordHash: string;
  roles?: Role[];
};

export class UserRepository {
  private readonly filePath: string;

  constructor(filePath = env.DATA_FILE) {
    this.filePath = resolve(filePath);
  }

  async findAll(): Promise<StoredUser[]> {
    return this.readUsers();
  }

  async findByEmail(email: string): Promise<StoredUser | undefined> {
    const normalized = email.toLowerCase();
    return (await this.readUsers()).find((user) => user.email === normalized);
  }

  async findById(id: string): Promise<StoredUser | undefined> {
    return (await this.readUsers()).find((user) => user.id === id);
  }

  async create(input: UserCreateInput): Promise<StoredUser> {
    const users = await this.readUsers();
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      roles: input.roles ?? ["user"],
      isEmailVerified: false,
      isDisabled: false,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now
    };

    users.push(user);
    await this.writeUsers(users);
    return user;
  }

  async updateRoles(id: string, roles: Role[]): Promise<StoredUser | undefined> {
    const users = await this.readUsers();
    const user = users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }

    user.roles = roles;
    user.updatedAt = new Date().toISOString();
    await this.writeUsers(users);
    return user;
  }

  async setDisabled(
    id: string,
    isDisabled: boolean
  ): Promise<StoredUser | undefined> {
    const users = await this.readUsers();
    const user = users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }

    user.isDisabled = isDisabled;
    user.updatedAt = new Date().toISOString();
    await this.writeUsers(users);
    return user;
  }

  async markLogin(id: string): Promise<StoredUser | undefined> {
    const users = await this.readUsers();
    const user = users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }

    const now = new Date().toISOString();
    user.lastLoginAt = now;
    user.updatedAt = now;
    await this.writeUsers(users);
    return user;
  }

  async updatePassword(
    id: string,
    passwordHash: string
  ): Promise<StoredUser | undefined> {
    const users = await this.readUsers();
    const user = users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }

    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    await this.writeUsers(users);
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const users = await this.readUsers();
    const nextUsers = users.filter((user) => user.id !== id);
    if (nextUsers.length === users.length) {
      return false;
    }

    await this.writeUsers(nextUsers);
    return true;
  }

  toPublicUser(user: StoredUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isEmailVerified: user.isEmailVerified,
      isDisabled: user.isDisabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  private async readUsers(): Promise<StoredUser[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return (JSON.parse(raw) as StoredUser[]).map((user) =>
        this.normalizeUser(user)
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  private async writeUsers(users: StoredUser[]) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(users, null, 2)}\n`);
  }

  private normalizeUser(user: StoredUser): StoredUser {
    return {
      ...user,
      isEmailVerified: user.isEmailVerified ?? false,
      isDisabled: user.isDisabled ?? false,
      updatedAt: user.updatedAt ?? user.createdAt
    };
  }
}
