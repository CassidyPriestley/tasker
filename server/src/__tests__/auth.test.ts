import request from "supertest";
import app from "../app";
import db from "../database/db";

const testUser = {
  email: "testuser@example.com",
  username: "testuser123",
  password: "password123",
};

describe("Auth endpoints", () => {
  beforeEach(async () => {
    // CLEARS TEST FOR EVERY ROUND
    await db.query("DELETE FROM users WHERE email = ? OR username = ?", [
      testUser.email,
      testUser.username,
    ]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = ? OR username = ?", [
      testUser.email,
      testUser.username,
    ]);
    await db.end();
  });

  describe("POST /auth/register", () => {
    it("registers a new user successfully", async () => {
      const res = await request(app).post("/auth/register").send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("userId");
      expect(res.body.message).toBe("User successfully created");
    });

    it("rejects a duplicate email", async () => {
      await request(app).post("/auth/register").send(testUser);

      const res = await request(app)
        .post("/auth/register")
        .send({ ...testUser, username: "differentUsername" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("This email is already registered");
    });

    it("rejects a duplicate username", async () => {
      await request(app).post("/auth/register").send(testUser);

      const res = await request(app)
        .post("/auth/register")
        .send({ ...testUser, email: "different@example.com" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("This username is already registered");
    });

    it("rejects an invalid email format", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ ...testUser, email: "not-an-email" });

      expect(res.status).toBe(400);
    });

    it("rejects a password shorter than 8 characters", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ ...testUser, password: "short" });

      expect(res.status).toBe(400);
    });

    it("rejects a username with invalid characters", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ ...testUser, username: "bad username!" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/auth/register").send(testUser);
    });

    it("logs in successfully with correct credentials and sets a cookie", async () => {
      const res = await request(app).post("/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User successfully logged in");

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies?.[0]).toMatch(/token=/);
    });

    it("rejects an incorrect password", async () => {
      const res = await request(app).post("/auth/login").send({
        email: testUser.email,
        password: "wrongPassword123",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("rejects a nonexistent email", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "doesnotexist@example.com",
        password: testUser.password,
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });
  });

  describe("POST /auth/logout", () => {
    it("clears the auth cookie", async () => {
      const res = await request(app).post("/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User successfully logged out");

      const cookies = res.headers["set-cookie"];
      expect(cookies?.[0]).toMatch(/token=;/);
    });
  });
});
