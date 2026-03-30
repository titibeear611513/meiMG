import request from "supertest";
import { createApp } from "../src/app.js";

describe("images routes", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.FRONTEND_URL = "http://localhost:5173";

    // These are not used by the health endpoint, but some modules expect them.
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_S3_BUCKET = "test-bucket";
  });

  it("GET /api/images/health should return ok: true", async () => {
    const app = createApp();
    const res = await request(app).get("/api/images/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, scope: "images" });
  });
});

