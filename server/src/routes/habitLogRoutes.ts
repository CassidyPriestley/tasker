import express from "express";
import { validate } from "../middleware/validate";
import {
  createHabitLog,
  deleteHabitLog,
  getHabitLogs,
  getHabitLogCount,
} from "../controllers/habitLogControllers";
import { createHabitLogSchema } from "../schemas/habitLogSchema";

const router = express.Router();

router.post("/habits/:id/logs", validate(createHabitLogSchema), createHabitLog);
router.get("/habits/:id/logs", getHabitLogs);
router.get("/habits/:id/logs/count", getHabitLogCount);
router.delete("/habits/logs/:logId", deleteHabitLog);

export default router;
