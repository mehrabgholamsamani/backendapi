import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { env } from "../config/env.js";
import type { StoredRefreshSession } from "../types/auth.js";
import { readJsonArray, writeJsonArray } from "../utils/jsonFile.js";

type SessionCreateInput = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
};

export class SessionRepository {
  private readonly filePath: string;

  constructor(filePath = env.SESSION_FILE) {
    this.filePath = resolve(filePath);
  }

  async create(input: SessionCreateInput): Promise<StoredRefreshSession> {
    const sessions = await this.readSessions();
    const session: StoredRefreshSession = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date().toISOString()
    };

    sessions.push(session);
    await this.writeSessions(sessions);
    return session;
  }

  async findActiveByTokenHash(
    tokenHash: string
  ): Promise<StoredRefreshSession | undefined> {
    const now = Date.now();
    return (await this.readSessions()).find(
      (session) =>
        session.tokenHash === tokenHash &&
        !session.revokedAt &&
        Date.parse(session.expiresAt) > now
    );
  }

  async revoke(sessionId: string, replacedBySessionId?: string) {
    const sessions = await this.readSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || session.revokedAt) {
      return;
    }

    session.revokedAt = new Date().toISOString();
    session.replacedBySessionId = replacedBySessionId;
    await this.writeSessions(sessions);
  }

  async revokeAllForUser(userId: string) {
    const sessions = await this.readSessions();
    const now = new Date().toISOString();
    let changed = false;

    for (const session of sessions) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
        changed = true;
      }
    }

    if (changed) {
      await this.writeSessions(sessions);
    }
  }

  private async readSessions(): Promise<StoredRefreshSession[]> {
    return readJsonArray<StoredRefreshSession>(this.filePath);
  }

  private async writeSessions(sessions: StoredRefreshSession[]) {
    await writeJsonArray(this.filePath, sessions);
  }
}
