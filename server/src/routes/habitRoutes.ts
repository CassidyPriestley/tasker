import express from "express";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  updateHabit,
  getHabitById,
  getHabits,
  restoreHabit,
  generateTaskFromHabit,
} from "../controllers/habitController";
import { validate } from "../middleware/validate";
import {
  createHabitSchema,
  generateTaskSchema,
  updateHabitSchema,
} from "./../schemas/habitSchema";

const router = express.Router();

router.post("/habits", validate(createHabitSchema), createHabit);
router.get("/habits", getHabits);
router.get("/habits/:id", getHabitById);
router.put("/habits/:id", validate(updateHabitSchema), updateHabit);
router.patch("/habits/:id/archive", archiveHabit);
router.patch("/habits/:id/restore", restoreHabit);
router.delete("/habits/:id", deleteHabit);
router.post(
  "/habits/:id/generate-task",
  validate(generateTaskSchema),
  generateTaskFromHabit,
);

export default router;
