import request from "supertest";
import db from "../database/db";
import app from "../app";

const testUser = {
  email: "usertester@example.com",
  username: "usertester1",
  password: "password123",
};

const secondUser = {
  email: "userstester2@example.com",
  username: "userstester2",
  password: "password123",
};

let authCookie: string;

describe("User endpoints", () => {
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

  // TEST: GET USER PROFILE
  describe("GET /users/me", () => {
    it("gets the logged-in user's profile", async () => {
      const res = await request(app).get("/users/me").set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.username).toBe(testUser.username);

      // CONFIRM password_hash IS NEVER EXPOSED
      expect(res.body.user).not.toHaveProperty("password_hash");
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).get("/users/me");
      expect(res.status).toBe(401);
    });
  });

  // TEST: UPDATE USERNAME
  describe("PUT /users/me/username", () => {
    it("updates the username successfully", async () => {
      const res = await request(app)
        .put("/users/me/username")
        .set("Cookie", authCookie)
        .send({ username: "updatedUsername1" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Username updated successfully");

      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", authCookie);
      expect(profileRes.body.user.username).toBe("updatedUsername1");

      // RESTORE ORIGINAL USERNAME SO LATER TESTS AREN'T AFFECTED
      await request(app)
        .put("/users/me/username")
        .set("Cookie", authCookie)
        .send({ username: testUser.username });
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app)
        .put("/users/me/username")
        .send({ username: "irrelevant" });
      expect(res.status).toBe(401);
    });

    it("rejects a username that's already taken", async () => {
      const res = await request(app)
        .put("/users/me/username")
        .set("Cookie", authCookie)
        .send({ username: secondUser.username });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("That username is already taken");
    });

    it("rejects a username that's too short", async () => {
      const res = await request(app)
        .put("/users/me/username")
        .set("Cookie", authCookie)
        .send({ username: "ab" });
      expect(res.status).toBe(400);
    });

    it("rejects a username that's too long", async () => {
      const res = await request(app)
        .put("/users/me/username")
        .set("Cookie", authCookie)
        .send({ username: "a".repeat(24) });
      expect(res.status).toBe(400);
    });

    it("rejects a username with invalid characters", async () => {
      const res = await request(app)
        .put("/users/me/username")
        .set("Cookie", authCookie)
        .send({ username: "bad username!" });
      expect(res.status).toBe(400);
    });
  });

  // TEST: UPDATE EMAIL
  describe("PUT /users/me/email", () => {
    it("updates the email successfully", async () => {
      const res = await request(app)
        .put("/users/me/email")
        .set("Cookie", authCookie)
        .send({ email: "updatedEmail@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Email updated successfully");

      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", authCookie);
      expect(profileRes.body.user.email).toBe("updatedEmail@example.com");

      // RESTORE ORIGINAL EMAIL SO LATER TESTS AND CLEANUP STILL MATCH
      await request(app)
        .put("/users/me/email")
        .set("Cookie", authCookie)
        .send({ email: testUser.email });
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app)
        .put("/users/me/email")
        .send({ email: "irrelevant@example.com" });
      expect(res.status).toBe(401);
    });

    it("rejects an email that's already taken", async () => {
      const res = await request(app)
        .put("/users/me/email")
        .set("Cookie", authCookie)
        .send({ email: secondUser.email });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("That email is already taken");
    });

    it("rejects a malformed email", async () => {
      const res = await request(app)
        .put("/users/me/email")
        .set("Cookie", authCookie)
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });
  });

  // TEST: UPDATE PASSWORD
  describe("PUT /users/me/password", () => {
    it("updates the password successfully and the new password actually works on login", async () => {
      const res = await request(app)
        .put("/users/me/password")
        .set("Cookie", authCookie)
        .send({
          current_password: testUser.password,
          new_password: "newSecurePass123",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password successfully updated");

      // PROVE THE CHANGE ACTUALLY TOOK EFFECT BY LOGGING IN WITH IT
      const loginRes = await request(app).post("/auth/login").send({
        email: testUser.email,
        password: "newSecurePass123",
      });
      expect(loginRes.status).toBe(200);

      // OLD PASSWORD SHOULD NO LONGER WORK
      const oldLoginRes = await request(app).post("/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      expect(oldLoginRes.status).toBe(401);

      // RESTORE ORIGINAL PASSWORD SO LATER TESTS STAY CONSISTENT
      await request(app)
        .put("/users/me/password")
        .set("Cookie", authCookie)
        .send({
          current_password: "newSecurePass123",
          new_password: testUser.password,
        });
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).put("/users/me/password").send({
        current_password: "irrelevant",
        new_password: "irrelevant123",
      });
      expect(res.status).toBe(401);
    });

    it("rejects an incorrect current password", async () => {
      const res = await request(app)
        .put("/users/me/password")
        .set("Cookie", authCookie)
        .send({
          current_password: "wrongPassword",
          new_password: "newSecurePass123",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Invalid password");
    });

    it("rejects a new password that's too short", async () => {
      const res = await request(app)
        .put("/users/me/password")
        .set("Cookie", authCookie)
        .send({
          current_password: testUser.password,
          new_password: "short",
        });
      expect(res.status).toBe(400);
    });
  });

  // TEST: DELETE USER
  describe("DELETE /users/me", () => {
    const deleteMeUser = {
      email: "deletemetest@example.com",
      username: "deletemetest1",
      password: "password123",
    };
    let deleteMeCookie: string;

    beforeAll(async () => {
      await db.query("DELETE FROM users WHERE email = ?", [deleteMeUser.email]);
      await request(app).post("/auth/register").send(deleteMeUser);
      const loginRes = await request(app).post("/auth/login").send({
        email: deleteMeUser.email,
        password: deleteMeUser.password,
      });
      deleteMeCookie = loginRes.headers["set-cookie"][0];
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app)
        .delete("/users/me")
        .send({ password: "irrelevant" });
      expect(res.status).toBe(401);
    });

    it("rejects an incorrect password", async () => {
      const res = await request(app)
        .delete("/users/me")
        .set("Cookie", deleteMeCookie)
        .send({ password: "wrongPassword" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Invalid password");

      // CONFIRM THE ACCOUNT STILL EXISTS
      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", deleteMeCookie);
      expect(profileRes.status).toBe(200);
    });

    it("deletes the account successfully with the correct password", async () => {
      const res = await request(app)
        .delete("/users/me")
        .set("Cookie", deleteMeCookie)
        .send({ password: deleteMeUser.password });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Account successfully deleted");

      // CONFIRM THE ROW IS ACTUALLY GONE
      const [rows]: any = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [deleteMeUser.email],
      );
      expect(rows.length).toBe(0);

      // OLD COOKIE'S TOKEN STILL VERIFIES (JWT ITSELF ISN'T INVALIDATED),
      // BUT THE USER NO LONGER EXISTS IN THE DATABASE
      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", deleteMeCookie);
      expect(profileRes.status).toBe(404);
      expect(profileRes.body.message).toBe("User not found");
    });
  });
});
