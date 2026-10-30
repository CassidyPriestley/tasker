import express from "express";
import {
  getUserProfile,
  updateUsername,
  updateEmail,
  updatePassword,
  deleteAccount,
  uploadAvatar,
  deleteAvatar,
} from "../controllers/userControllers";
import { validate } from "../middleware/validate";
import {
  deleteAccountSchema,
  updateEmailSchema,
  updatePasswordSchema,
  updateUsernameSchema,
} from "../schemas/userSchema";
import authenticate from "../middleware/authenticate";
import upload from "../middleware/uploadAvatar";

const router = express.Router();

router.get("/users/me", getUserProfile);
router.put(
  "/users/me/username",
  validate(updateUsernameSchema),
  updateUsername,
);
router.put("/users/me/email", validate(updateEmailSchema), updateEmail);
router.put(
  "/users/me/password",
  validate(updatePasswordSchema),
  updatePassword,
);
router.delete("/users/me", validate(deleteAccountSchema), deleteAccount);

// AVATAR ROUTES
router.post("/users/me/avatar", upload.single("avatar"), uploadAvatar);
router.delete("/users/me/avatar", deleteAvatar);

export default router;
