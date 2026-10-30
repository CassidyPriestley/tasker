import express from "express";
import { register, login, logout } from "../controllers/authControllers";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../schemas/authSchemas";

const router = express.Router();

router.post("/auth/register", validate(registerSchema), register);
router.post("/auth/login", validate(loginSchema), login);
router.post("/auth/logout", logout);

export default router;
