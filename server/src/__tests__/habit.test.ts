import request from "supertest";
import db from "../database/db";
import app from "../app";
import { Habit } from "../types/Habit";

const testUser = {
  email: "habittester@example.com",
  username: "habittester1",
  password: "password123",
};

let authCookie: string;

describe("Habit endpoints", () => {
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

  // TEST: CREATE HABIT
  describe("POST /habits", () => {
    it("creates a new habit successfully and persists it in the database", async () => {
      const res = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Test habit" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("habitId");

      // CHECK DATABASE
      const [rows] = await db.query<Habit[]>(
        "SELECT * FROM habit WHERE id = ?",
        [res.body.habitId],
      );

      expect(rows.length).toBe(1);
      expect(rows[0].title).toBe("Test habit");
      expect(rows[0].frequency).toBe("daily");
      expect(rows[0].generates_task).toBe(0);
      expect(rows[0].id).toBe(res.body.habitId);

      const [userRows] = await db.query<{ id: number }[] & any>(
        "SELECT id FROM users WHERE email = ?",
        [testUser.email],
      );
      expect(rows[0].user_id).toBe(userRows[0].id);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).post("/habits").send({
        title: "No auth",
      });
      expect(res.status).toBe(401);
    });
  });

  // TEST: GET HABITS
  describe("GET /habits", () => {
    it("gets habits successfully and returns the habits belonging to the user", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for GET /habits test" });

      const res = await request(app).get("/habits").set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.habits)).toBe(true);
      expect(res.body.habits.length).toBeGreaterThan(0);

      const found = res.body.habits.find(
        (t: any) => t.id === createRes.body.habitId,
      );
      expect(found).toBeDefined();
      expect(found.title).toBe("Habit for GET /habits test");

      const [userRows] = await db.query<{ id: number }[] & any>(
        "SELECT id FROM users WHERE email = ?",
        [testUser.email],
      );
      for (const habit of res.body.habits) {
        expect(habit.user_id).toBe(userRows[0].id);
      }
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/habits");
      expect(res.status).toBe(401);
    });
  });

  // TEST: GET HABIT BY ID
  describe("GET /habits/:id", () => {
    it("gets a habit by id successfully and returns the habit belonging to the user", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for GET habit by id" });

      const res = await request(app)
        .get(`/habits/${createRes.body.habitId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.habit.id).toBe(createRes.body.habitId);
      expect(res.body.habit.title).toBe("Habit for GET habit by id");

      const [userRows] = await db.query<{ id: number }[] & any>(
        "SELECT id FROM users WHERE email = ?",
        [testUser.email],
      );
      expect(res.body.habit.user_id).toBe(userRows[0].id);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/habits/1");
      expect(res.status).toBe(401);
    });

    it("returns 400 for an invalid habit id", async () => {
      const res = await request(app)
        .get("/habits/not-a-number")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent habit id", async () => {
      const res = await request(app)
        .get("/habits/999999")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });

  // TEST: UPDATE HABIT
  describe("PUT /habits/:id", () => {
    it("updates a habit successfully", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit before update" });

      const res = await request(app)
        .put(`/habits/${createRes.body.habitId}`)
        .set("Cookie", authCookie)
        .send({ title: "Habit after update" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Habit successfully updated");

      const [rows] = await db.query<Habit[]>(
        "SELECT * FROM habit WHERE id = ?",
        [createRes.body.habitId],
      );
      expect(rows[0].title).toBe("Habit after update");
    });

    it("rejects an empty update body", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit for empty update test" });

      const res = await request(app)
        .put(`/habits/${createRes.body.habitId}`)
        .set("Cookie", authCookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No valid fields provided to update");
    });

    it("returns 400 for an invalid habit id", async () => {
      const res = await request(app)
        .put("/habits/not-a-number")
        .set("Cookie", authCookie)
        .send({ title: "Habit does not exist" });
      expect(res.status).toBe(400);
    });

    it("returns 404 error for a nonexistent habit id", async () => {
      const res = await request(app)
        .put("/habits/999999")
        .set("Cookie", authCookie)
        .send({ title: "Habit cannot be found" });
      expect(res.status).toBe(404);
    });
  });

  // TEST: ARCHIVE HABIT
  describe("PATCH /habits/:id/archive", () => {
    it("archives a habit successfully", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Test habit archive" });

      const res = await request(app)
        .patch(`/habits/${createRes.body.habitId}/archive`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Habit successfully archived");

      const [rows] = await db.query<Habit[]>(
        "SELECT * FROM habit WHERE id = ?",
        [createRes.body.habitId],
      );
      expect(rows[0].archived_at).toBeDefined();
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).patch("/habits/1/archive");
      expect(res.status).toBe(401);
    });

    it("returns 404 when the habit is already archived", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit double-archive test" });

      await request(app)
        .patch(`/habits/${createRes.body.habitId}/archive`)
        .set("Cookie", authCookie);

      const res = await request(app)
        .patch(`/habits/${createRes.body.habitId}/archive`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Habit was not found");
    });

    it("returns 404 for a nonexistent habit id", async () => {
      const res = await request(app)
        .patch("/habits/99999/archive")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });

  // TEST: RESTORE HABIT
  describe("PATCH /habits/:id/restore", () => {
    it("restores an archived habit successfully", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit to archive then restore" });

      await request(app)
        .patch(`/habits/${createRes.body.habitId}/archive`)
        .set("Cookie", authCookie);

      const res = await request(app)
        .patch(`/habits/${createRes.body.habitId}/restore`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Archived habit successfully restored");

      const [rows] = await db.query<Habit[]>(
        "SELECT * FROM habit WHERE id = ?",
        [createRes.body.habitId],
      );
      expect(rows[0].archived_at).toBeNull();
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).patch("/habits/1/restore");
      expect(res.status).toBe(401);
    });

    it("returns 404 when the habit was never archived", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit never archived" });

      const res = await request(app)
        .patch(`/habits/${createRes.body.habitId}/restore`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Archived habit not found");
    });

    it("returns 404 for nonexistent habit id", async () => {
      const res = await request(app)
        .patch("/habits/999999/restore")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });

  // TEST: DELETE HABIT
  describe("DELETE /habits/:id", () => {
    it("deletes a habit successfully", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit to delete" });

      const res = await request(app)
        .delete(`/habits/${createRes.body.habitId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Habit deleted successfully");

      const [rows] = await db.query<Habit[]>(
        "SELECT * FROM habit WHERE id = ?",
        [createRes.body.habitId],
      );
      expect(rows.length).toBe(0);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).delete("/habits/1");
      expect(res.status).toBe(401);
    });

    it("returns 400 for an invalid habit id", async () => {
      const res = await request(app)
        .delete("/habits/not-a-number")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent habit id", async () => {
      const res = await request(app)
        .delete("/habits/999999")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });

  // TEST: GENERATE TASK FROM HABIT
  describe("POST /habits/:id/generate-task", () => {
    it("generates a task from a habit successfully", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({ title: "Habit that generates task", generates_task: true });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/generate-task`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("taskId");

      // CONFIRM TASK IS INSIDE TASK TABLE
      const [taskRows]: any = await db.query(
        "SELECT * FROM task WHERE id = ?",
        [res.body.taskId],
      );
      expect(taskRows.length).toBe(1);
      expect(taskRows[0].habit_id).toBe(createRes.body.habitId);
      expect(taskRows[0].title).toBe("Habit that generates task");
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).post("/habits/1/generate-task");
      expect(res.status).toBe(401);
    });

    it("rejects generating a task when generates_task is false", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({
          title: "Habit that does not generate tasks",
          generates_task: false,
        });

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/generate-task`)
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "This habit is not set up to generate tasks",
      );
    });

    it("rejects generating a task from an archived habit", async () => {
      const createRes = await request(app)
        .post("/habits")
        .set("Cookie", authCookie)
        .send({
          title: "Habit to archive before generate-task",
          generates_task: true,
        });

      await request(app)
        .patch(`/habits/${createRes.body.habitId}/archive`)
        .set("Cookie", authCookie);

      const res = await request(app)
        .post(`/habits/${createRes.body.habitId}/generate-task`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Habit not found");
    });

    it("returns 400 for an invalid habit id", async () => {
      const res = await request(app)
        .post("/habits/not-a-number/generate-task")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent habit id", async () => {
      const res = await request(app)
        .post("/habits/99999/generate-task")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });
});
