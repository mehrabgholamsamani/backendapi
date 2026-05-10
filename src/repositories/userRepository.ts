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
      passwordHash: input.passwordHash,
      createdAt: now
    };

    users.push(user);
    await this.writeUsers(users);
    return user;
  }

  toPublicUser(user: StoredUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      createdAt: user.createdAt
    };
  }

  private async readUsers(): Promise<StoredUser[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as StoredUser[];
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
}
