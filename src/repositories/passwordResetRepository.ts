import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { env } from "../config/env.js";
import type { StoredPasswordReset } from "../types/auth.js";
import { readJsonArray, writeJsonArray } from "../utils/jsonFile.js";

type PasswordResetCreateInput = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
};

export class PasswordResetRepository {
  private readonly filePath: string;

  constructor(filePath = env.PASSWORD_RESET_FILE) {
    this.filePath = resolve(filePath);
  }

  async create(input: PasswordResetCreateInput): Promise<StoredPasswordReset> {
    const resets = await this.readResets();
    const reset: StoredPasswordReset = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date().toISOString()
    };

    resets.push(reset);
    await this.writeResets(resets);
    return reset;
  }

  async findActiveByTokenHash(
    tokenHash: string
  ): Promise<StoredPasswordReset | undefined> {
    const now = Date.now();
    return (await this.readResets()).find(
      (reset) =>
        reset.tokenHash === tokenHash &&
        !reset.usedAt &&
        Date.parse(reset.expiresAt) > now
    );
  }

  async markUsed(id: string) {
    const resets = await this.readResets();
    const reset = resets.find((item) => item.id === id);
    if (!reset || reset.usedAt) {
      return;
    }

    reset.usedAt = new Date().toISOString();
    await this.writeResets(resets);
  }

  async revokeActiveForUser(userId: string) {
    const resets = await this.readResets();
    const now = new Date().toISOString();
    let changed = false;

    for (const reset of resets) {
      if (reset.userId === userId && !reset.usedAt) {
        reset.usedAt = now;
        changed = true;
      }
    }

    if (changed) {
      await this.writeResets(resets);
    }
  }

  private async readResets(): Promise<StoredPasswordReset[]> {
    return readJsonArray<StoredPasswordReset>(this.filePath);
  }

  private async writeResets(resets: StoredPasswordReset[]) {
    await writeJsonArray(this.filePath, resets);
  }
}
