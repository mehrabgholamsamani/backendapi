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
  process.env.PASSWORD_RESET_FILE = join(dataDir, "password-resets.json");
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

const loadApp = async () => {
  const { createApp } = await import("./app.js");
  return createApp();
};

const createAdminAccessToken = async () => {
  const { UserRepository } = await import("./repositories/userRepository.js");
  const { hashPassword } = await import("./utils/password.js");
  const { signAccessToken } = await import("./utils/token.js");
  const users = new UserRepository();
  const admin = await users.create({
    email: "admin@example.com",
    name: "Admin",
    passwordHash: await hashPassword("password123"),
    roles: ["admin"]
  });

  return signAccessToken(users.toPublicUser(admin));
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

  it("resets passwords with one-time tokens and revokes refresh sessions", async () => {
    const app = await loadApp();

    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const forgot = await request(app).post("/auth/password/forgot").send({
      email: "person@example.com"
    });

    expect(forgot.status).toBe(200);
    expect(forgot.body.resetToken).toEqual(expect.any(String));

    const reset = await request(app).post("/auth/password/reset").send({
      resetToken: forgot.body.resetToken,
      password: "new-password123"
    });

    expect(reset.status).toBe(204);

    const oldLogin = await request(app).post("/auth/login").send({
      email: "person@example.com",
      password: "password123"
    });

    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/auth/login").send({
      email: "person@example.com",
      password: "new-password123"
    });

    expect(newLogin.status).toBe(200);

    const refresh = await request(app).post("/auth/refresh").send({
      refreshToken: registration.body.refreshToken
    });

    expect(refresh.status).toBe(401);

    const replay = await request(app).post("/auth/password/reset").send({
      resetToken: forgot.body.resetToken,
      password: "another-password123"
    });

    expect(replay.status).toBe(401);
  });

  it("does not create reset tokens for unknown accounts", async () => {
    const app = await loadApp();

    const forgot = await request(app).post("/auth/password/forgot").send({
      email: "missing@example.com"
    });

    expect(forgot.status).toBe(200);
    expect(forgot.body.message).toEqual(expect.any(String));
    expect(forgot.body.resetToken).toBeUndefined();
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

  it("lets admins update roles and list users", async () => {
    const app = await loadApp();
    const adminToken = await createAdminAccessToken();
    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const update = await request(app)
      .patch(`/admin/users/${registration.body.user.id}/roles`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roles: ["user", "admin"] });

    expect(update.status).toBe(200);
    expect(update.body.user.roles).toEqual(["user", "admin"]);

    const list = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    expect(list.body.users).toHaveLength(2);
    expect(list.body.users[1].passwordHash).toBeUndefined();
  });

  it("blocks disabled accounts and revokes their refresh sessions", async () => {
    const app = await loadApp();
    const adminToken = await createAdminAccessToken();
    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const disable = await request(app)
      .patch(`/admin/users/${registration.body.user.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isDisabled: true });

    expect(disable.status).toBe(200);
    expect(disable.body.user.isDisabled).toBe(true);

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${registration.body.accessToken}`);

    expect(me.status).toBe(401);

    const refresh = await request(app).post("/auth/refresh").send({
      refreshToken: registration.body.refreshToken
    });

    expect(refresh.status).toBe(401);
  });

  it("lets admins delete users and blocks self-delete", async () => {
    const app = await loadApp();
    const adminToken = await createAdminAccessToken();
    const registration = await request(app).post("/auth/register").send({
      email: "person@example.com",
      name: "Person",
      password: "password123"
    });

    const selfDelete = await request(app)
      .delete(`/admin/users/${registration.body.user.id}`)
      .set("Authorization", `Bearer ${registration.body.accessToken}`);

    expect(selfDelete.status).toBe(403);

    const deleted = await request(app)
      .delete(`/admin/users/${registration.body.user.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleted.status).toBe(204);

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${registration.body.accessToken}`);

    expect(me.status).toBe(401);
  });
});
