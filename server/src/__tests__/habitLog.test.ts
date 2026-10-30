import request from "supertest";
import db from "../database/db";
import app from "../app";
import { HabitLog } from "../types/HabitLog";

const testUser = {
  email: "habitlogtester@example.com",
  username: "habitlogtester1",
  password: "password123",
};

let authCookie: string;

describe("Habit log endpoints", () => {
  beforeAll(async () => {
    await db.query("DELETE FROM users WHERE email = ? OR username = ?", [
      testUser.email,
      testUser.username,
    ]);

    await request(app).post("/auth/register").send(testUser);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });
    authCookie = loginRes.headers["set-cookie"][0];
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = ?", [testUser.email]);
    await db.end();
  });

  // TEST: CREATE HABIT LOG
  describe("POST /habits/:id/logs", () => {
    it("creates a habit log from a habit successfully, defaulting to today's date", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for habit log test" });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("habitLogId");

      // CONFIRM IT PERSISTED WITH TODAY'S DATE
      const [rows] = await db.query<HabitLog[]>(
        "SELECT * FROM habit_log WHERE id = ?",
        [res.body.habitLogId],
      );
      expect(rows.length).toBe(1);
      expect(rows[0].habit_id).toBe(createRes.body.habitId);

      const today = new Date().toISOString().slice(0, 10);
      const completedAt = (rows[0].completed_at as unknown as Date)
        .toISOString()
        .slice(0, 10);
      expect(completedAt).toBe(today);
    });

    it("creates a habit log with an explicit completed_at date", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for explicit date log test" });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-20" });

      expect(res.status).toBe(201);

      const [rows] = await db.query<HabitLog[]>(
        "SELECT * FROM habit_log WHERE id = ?",
        [res.body.habitLogId],
      );
      const completedAt = (rows[0].completed_at as unknown as Date)
        .toISOString()
        .slice(0, 10);
      expect(completedAt).toBe("2026-09-20");
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).post("/habits/1/logs").send({});
      expect(res.status).toBe(401);
    });

    it("rejects a duplicate log for the same habit and date", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for duplicate log test" });

      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-21" });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-21" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "This habit is already logged for that date",
      );
    });

    it("rejects an invalid habit id", async () => {
      const res = await request(app)
        .post("/habits/not-a-number/logs")
        .set("Cookie", authCookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it("rejects a nonexistent habit id", async () => {
      const res = await request(app)
        .post("/habits/999999/logs")
        .set("Cookie", authCookie)
        .send({});
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Habit not found");
    });

    it("rejects a malformed completed_at date", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for malformed date test" });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "09-21-2026" });

      expect(res.status).toBe(400);
    });

    it("rejects a completed_at that isn't a real calendar date", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for invalid calendar date test" });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-13-45" });

      expect(res.status).toBe(400);
    });
  });

  // TEST: GET HABIT LOGS
  describe("GET /habits/:id/logs", () => {
    it("gets all logs for a habit", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for GET logs test" });

      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-18" });
      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-19" });

      const res = await request(app)
        .get(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.logs.length).toBe(2);
    });

    it("filters logs by start and end date", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for date-filtered logs test" });

      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-01" });
      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-15" });
      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-25" });

      const res = await request(app)
        .get(`/habits/${createRes.body.habitId}/logs`)
        .query({ start: "2026-09-10", end: "2026-09-20" })
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBe(1);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/habits/1/logs");
      expect(res.status).toBe(401);
    });

    it("rejects an invalid habit id", async () => {
      const res = await request(app)
        .get("/habits/not-a-number/logs")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });
  });

  // TEST: GET HABIT LOG COUNT
  describe("GET /habits/:id/logs/count", () => {
    it("returns the correct log count for a habit", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for count test" });

      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-10" });
      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-11" });
      await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-12" });

      const res = await request(app)
        .get(`/habits/${createRes.body.habitId}/logs/count`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
    });

    it("returns 0 for a habit with no logs", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit with zero logs" });

      const res = await request(app)
        .get(`/habits/${createRes.body.habitId}/logs/count`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/habits/1/logs/count");
      expect(res.status).toBe(401);
    });

    it("rejects an invalid habit id", async () => {
      const res = await request(app)
        .get("/habits/not-a-number/logs/count")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });
  });

  // TEST: DELETE HABIT LOG
  describe("DELETE /habits/logs/:logId", () => {
    it("deletes a habit log successfully", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for delete log test" });

      const logRes = await request(app)
        .post(`/habits/${createRes.body.habitId}/logs`)
        .set("Cookie", authCookie)
        .send({ completed_at: "2026-09-22" });

      const res = await request(app)
        .delete(`/habits/logs/${logRes.body.habitLogId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Habit log successfully deleted");

      // CONFIRM IT'S ACTUALLY GONE FROM THE DATABASE
      const [rows] = await db.query<HabitLog[]>(
        "SELECT * FROM habit_log WHERE id = ?",
        [logRes.body.habitLogId],
      );
      expect(rows.length).toBe(0);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).delete("/habits/logs/1");
      expect(res.status).toBe(401);
    });

    it("returns 400 for an invalid log id", async () => {
      const res = await request(app)
        .delete("/habits/logs/not-a-number")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent log id", async () => {
      const res = await request(app)
        .delete("/habits/logs/999999")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });
});
