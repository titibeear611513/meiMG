import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

let app;
let adminPool;
let testEmail;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "../src/db/schema_users.sql");

beforeAll(async () => {
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.FRONTEND_URL = "http://localhost:5173";
  process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
  process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "test-bucket";

  // Use your local DB (or export DATABASE_URL before running tests).
  // If DB isn't reachable, the tests will fail; this file is meant for local dev.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://liuxiuwei@localhost:5432/meimg";
  }

  adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
  await adminPool.query("SELECT 1");

  // Ensure required tables exist for register tests.
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await adminPool.query(schemaSql);

  const mod = await import("../src/app.js");
  app = mod.createApp();
});

beforeEach(() => {
  testEmail = `jest_user_${Date.now()}@example.com`;
});

afterAll(async () => {
  try {
    if (testEmail) {
      await adminPool.query("DELETE FROM users WHERE email = $1", [testEmail]);
    }
  } finally {
    await adminPool.end();
  }
});

describe("POST /api/auth/register", () => {
  it("returns 400 when email or password is missing", async () => {
    const res1 = await request(app).post("/api/auth/register").send({});
    expect(res1.status).toBe(400);
    expect(res1.body).toEqual({ error: "email and password are required" });

    const res2 = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@a.com" });
    expect(res2.status).toBe(400);
    expect(res2.body).toEqual({ error: "email and password are required" });
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: testEmail, password: "123" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "password must be at least 8 characters" });
  });

  it("creates user and returns 201", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: "12345678",
      displayName: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toMatchObject({
      email: testEmail.toLowerCase(),
      displayName: "Test User",
    });
    expect(typeof res.body.user.id).toBe("number");
    expect(typeof res.body.user.avatarUrl).toBe("string");
    expect(res.body.user.avatarUrl.length).toBeGreaterThan(0);
  });

  it("returns 409 on duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: "12345678",
      displayName: "First",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: "12345678",
      displayName: "Second",
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "email already registered" });
  });
});

