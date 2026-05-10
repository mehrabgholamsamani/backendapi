import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dataDir: string;

beforeEach(async () => {
  vi.resetModules();
  dataDir = await mkdtemp(join(tmpdir(), "backendapi-"));
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  process.env.DATA_FILE = join(dataDir, "users.json");
  process.env.SESSION_FILE = join(dataDir, "sessions.json");
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

const loadApp = async () => {
  const { createApp } = await import("./app.js");
  return createApp();
};

describe("auth API", () => {
  it("registers, logs in, and returns the current user", async () => {
    const app = await loadApp();

    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    expect(registration.status).toBe(201);
    expect(registration.body.accessToken).toEqual(expect.any(String));
    expect(registration.body.refreshToken).toEqual(expect.any(String));
    expect(registration.body.user.email).toBe("person@example.com");
    expect(registration.body.user.passwordHash).toBeUndefined();

    const login = await request(app).post("/auth/login").send({
      email: "person@example.com",
      password: "password123"
    });

    expect(login.status).toBe(200);
    expect(login.body.refreshToken).toEqual(expect.any(String));

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("person@example.com");
  });

  it("rotates refresh tokens and rejects reused tokens", async () => {
    const app = await loadApp();

    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const firstRefreshToken = registration.body.refreshToken;
    const refresh = await request(app).post("/auth/refresh").send({
      refreshToken: firstRefreshToken
    });

    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toEqual(expect.any(String));
    expect(refresh.body.refreshToken).toEqual(expect.any(String));
    expect(refresh.body.refreshToken).not.toBe(firstRefreshToken);

    const replay = await request(app).post("/auth/refresh").send({
      refreshToken: firstRefreshToken
    });

    expect(replay.status).toBe(401);
  });

  it("revokes refresh tokens on logout", async () => {
    const app = await loadApp();

    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const logout = await request(app).post("/auth/logout").send({
      refreshToken: registration.body.refreshToken
    });

    expect(logout.status).toBe(204);

    const refresh = await request(app).post("/auth/refresh").send({
      refreshToken: registration.body.refreshToken
    });

    expect(refresh.status).toBe(401);
  });

  it("rejects admin routes for regular users", async () => {
    const app = await loadApp();

    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const response = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${registration.body.accessToken}`);

    expect(response.status).toBe(403);
  });
});
