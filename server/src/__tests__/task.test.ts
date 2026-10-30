import request from "supertest";
import app from "../app";
import db from "../database/db";
import { Task } from "../types/Task";

const testUser = {
  email: "tasktester@example.com",
  username: "tasktester1",
  password: "password123",
};

let authCookie: string;

describe("Task endpoints", () => {
  beforeAll(async () => {
    await db.query("DELETE FROM users WHERE email = ? OR username = ?", [
      testUser.email,
      testUser.username,
    ]);

    await request(app).post("/auth/register").send(testUser);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    // GET COOKIE
    authCookie = loginRes.headers["set-cookie"][0];
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = ?", [testUser.email]);
    await db.end();
  });

  it("creates a task successfully", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Cookie", authCookie)
      .send({ title: "Test task" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("taskId");
  });

  it("Rejects a request with no auth cookie", async () => {
    const res = await request(app).post("/tasks").send({ title: "No auth" });
    expect(res.status).toBe(401);
  });

  // TEST: CREATE TASK
  describe("POST /tasks", () => {
    it("creates a new task successfully and persists it in the database", async () => {
      const res = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Test task" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("taskId");

      // CHECK DATABASE
      const [rows] = await db.query<Task[]>("SELECT * FROM task WHERE id = ?", [
        res.body.taskId,
      ]);

      expect(rows.length).toBe(1);
      expect(rows[0].title).toBe("Test task");
      expect(rows[0].status).toBe("pending"); // DEFAULT VALUE
      expect(rows[0].priority).toBe("medium"); // DEFAULT VALUE
      expect(rows[0].habit_id).toBeNull();

      const [userRows] = await db.query<{ id: number }[] & any>(
        "SELECT id FROM users WHERE email = ?",
        [testUser.email],
      );
      expect(rows[0].user_id).toBe(userRows[0].id);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).post("/tasks").send({ title: "No auth" });

      expect(res.status).toBe(401);
    });
  });

  // TEST: GET TASKS
  describe("GET /tasks", () => {
    it("gets tasks succsessfully and return the tasks belonging to the user", async () => {
      // CREATE TASK SO THERE IS SOMETHING TO FETCH
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task for GET /tasks test" });
      // GET REQUEST TEST
      const res = await request(app).get("/tasks").set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThan(0);

      // CONFIRM THE TAST WE CREATED IS IN THE RETRUNED TASKS LIST
      const found = res.body.tasks.find(
        (t: any) => t.id === createRes.body.taskId,
      );
      expect(found).toBeDefined();
      expect(found.title).toBe("Task for GET /tasks test");

      // PROVE EVERY RETRUNED TASKS BELONGS TO USER
      const [userRows] = await db.query<{ id: number }[] & any>(
        "SELECT id FROM users WHERE email = ?",
        [testUser.email],
      );
      for (const task of res.body.tasks) {
        expect(task.user_id).toBe(userRows[0].id);
      }
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/tasks").send({ title: "No auth" });
      expect(res.status).toBe(401);
    });
  });

  // TEST: GET TASK BY ID
  describe("GET /tasks/:id", () => {
    it("gets a task by id successfully and returns the task belonging to the user", async () => {
      // CREATE A TASK
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task for GET task by id" });

      // FETCH TASK BY THE CREATED TASK ID
      const res = await request(app)
        .get(`/tasks/${createRes.body.taskId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.task.id).toBe(createRes.body.taskId);
      expect(res.body.task.title).toBe("Task for GET task by id");

      const [userRows] = await db.query<{ id: number }[] & any>(
        "SELECT id FROM users WHERE email = ?",
        [testUser.email],
      );

      expect(res.body.task.user_id).toBe(userRows[0].id);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/tasks/1");
      expect(res.status).toBe(401);
    });

    it("returns 400 for an invalid task id", async () => {
      const res = await request(app)
        .get("/tasks/not-a-number")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent task id", async () => {
      const res = await request(app)
        .get("/tasks/9999999999")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });

  // TEST: UPDATE TASK
  describe("PUT /tasks/:id", () => {
    it("updates a task successfully", async () => {
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task before update" });

      const res = await request(app)
        .put(`/tasks/${createRes.body.taskId}`)
        .set("Cookie", authCookie)
        .send({ title: "Task after update", priority: "high" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Task successfully updated");

      // CONFIRM CHANGE PERSISTED TO DB
      const [rows] = await db.query<Task[]>("SELECT * FROM task WHERE id = ?", [
        createRes.body.taskId,
      ]);
      expect(rows[0].title).toBe("Task after update");
      expect(rows[0].priority).toBe("high");
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).put("/tasks/1").send({ title: "No auth" });
      expect(res.status).toBe(401);
    });

    it("rejects an empty update body", async () => {
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task for empty update test" });

      const res = await request(app)
        .put(`/tasks/${createRes.body.taskId}`)
        .set("Cookie", authCookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "At least one field must be provided to update the task",
      );
    });

    it("returns 400 for an invalid task id", async () => {
      const res = await request(app)
        .put("/tasks/not-a-number")
        .set("Cookie", authCookie)
        .send({ title: "Task does not exist" });
      expect(res.status).toBe(400);
    });

    it("returns 404 error for a nonexistent task id", async () => {
      const res = await request(app)
        .put("/tasks/999999")
        .set("Cookie", authCookie)
        .send({ title: "Task cannot be found" });
      expect(res.status).toBe(404);
    });
  });

  // TEST UPDATE TASK STATUS
  describe("PUT /tasks/:id/status", () => {
    it("updates a task's status successfully", async () => {
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task for status update" });

      const res = await request(app)
        .put(`/tasks/${createRes.body.taskId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "in_progress" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Task status successfully updated");

      const [rows] = await db.query<Task[]>("SELECT * FROM task WHERE id = ?", [
        createRes.body.taskId,
      ]);
      expect(rows[0].status).toBe("in_progress");
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app)
        .put("/tasks/1/status")
        .send({ status: "completed" });
      expect(res.status).toBe(401);
    });

    it("rejects an invalid status value", async () => {
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task for invalid status test" });

      const res = await request(app)
        .put(`/tasks/${createRes.body.taskId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "not_a_real_status" });

      expect(res.status).toBe(400);
    });

    it("returns 400 for an invalid id", async () => {
      const res = await request(app)
        .put("/tasks/not-a-number/status")
        .set("Cookie", authCookie)
        .send({ status: "completed" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent task id", async () => {
      const res = await request(app)
        .put("/tasks/999999/status")
        .set("Cookie", authCookie)
        .send({ status: "completed" });
      expect(res.status).toBe(404);
    });
  });

  // TEST DELETE TASK
  describe("DELETE /tasks/:id", () => {
    it("deletes a task successfully", async () => {
      const createRes = await request(app)
        .post("/tasks")
        .set("Cookie", authCookie)
        .send({ title: "Task to delete" });

      const res = await request(app)
        .delete(`/tasks/${createRes.body.taskId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Task successfully deleted");

      // CONFIRM IT'S ACTUALLY GONE FROM THE DATABASE
      const [rows] = await db.query<Task[]>("SELECT * FROM task WHERE id = ?", [
        createRes.body.taskId,
      ]);
      expect(rows.length).toBe(0);
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).delete("/tasks/1");
      expect(res.status).toBe(401);
    });

    it("returns 400 for an invalid task id", async () => {
      const res = await request(app)
        .delete("/tasks/not-a-number")
        .set("Cookie", authCookie);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent task id", async () => {
      const res = await request(app)
        .delete("/tasks/999999")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
    });
  });
});
