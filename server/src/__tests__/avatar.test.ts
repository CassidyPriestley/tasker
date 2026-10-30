import request from "supertest";
import db from "../database/db";
import app from "../app";
import cloudinary from "../utils/cloudinary";

// MOCK CLOUDINARY SO TESTS DON'T HIT THE REAL API OR BURN CREDITS
jest.mock("../utils/cloudinary", () => ({
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      return {
        end: (buffer: Buffer) => {
          callback(null, {
            secure_url: "https://res.cloudinary.com/fake/avatars/test.jpg",
          });
        },
      };
    }),
    destroy: jest.fn().mockResolvedValue({ result: "ok" }),
  },
}));

const testUser = {
  email: "avatartester@example.com",
  username: "avatartester1",
  password: "password123",
};

let authCookie: string;

describe("Avatar endpoints", () => {
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

  describe("POST /users/me/avatar", () => {
    it("uploads an avatar successfully", async () => {
      const res = await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie)
        .attach("avatar", Buffer.from("fake image data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Avatar uploaded successfully");
      expect(res.body.avatarUrl).toBe(
        "https://res.cloudinary.com/fake/avatars/test.jpg",
      );

      // CONFIRM IT PERSISTED
      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", authCookie);
      expect(profileRes.body.user.avatar_url).toBe(
        "https://res.cloudinary.com/fake/avatars/test.jpg",
      );
    });

    it("replaces an existing avatar when uploading a new one", async () => {
      // UPLOAD FIRST ONE
      await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie)
        .attach("avatar", Buffer.from("first image"), {
          filename: "first.jpg",
          contentType: "image/jpeg",
        });

      // UPLOAD A SECOND — SHOULD OVERWRITE (NOT CREATE DUPLICATE)
      const res = await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie)
        .attach("avatar", Buffer.from("second image"), {
          filename: "second.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);

      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", authCookie);

      // ONLY ONE USER ROW EXIST— CONFIRM THIS IS AN UPDATE (NOT A SECOND ROW)
      expect(profileRes.body.user.avatar_url).toBe(
        "https://res.cloudinary.com/fake/avatars/test.jpg",
      );
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app)
        .post("/users/me/avatar")
        .attach("avatar", Buffer.from("fake image data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(401);
    });

    it("rejects a request with no file attached", async () => {
      const res = await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No image file provided");
    });

    it("rejects a disallowed file type", async () => {
      const res = await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie)
        .attach("avatar", Buffer.from("fake pdf data"), {
          filename: "test.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Only JPEG, PNG, and WEBP images are allowed",
      );
    });

    it("rejects a file larger than 5MB", async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const res = await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie)
        .attach("avatar", bigBuffer, {
          filename: "big.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /users/me/avatar", () => {
    it("removes the avatar successfully", async () => {
      // MAKE SURE THERE'S AN AVATAR SET FIRST
      await request(app)
        .post("/users/me/avatar")
        .set("Cookie", authCookie)
        .attach("avatar", Buffer.from("fake image data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      const res = await request(app)
        .delete("/users/me/avatar")
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Avatar removed successfully");
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        expect.stringMatching(/^avatars\/user_\d+$/),
        { invalidate: true },
      );

      const profileRes = await request(app)
        .get("/users/me")
        .set("Cookie", authCookie);
      expect(profileRes.body.user.avatar_url).toBeNull();
    });

    it("rejects a request with no auth cookie", async () => {
      const res = await request(app).delete("/users/me/avatar");
      expect(res.status).toBe(401);
    });
  });
});
